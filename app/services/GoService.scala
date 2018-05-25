package service

import scala.reflect.ClassTag

object Player extends Enumeration {
  val BLACK, WHITE = Value
}

case class Point(x: Int, y: Int) {
  def +(that: Point): Point = {
    Point(x = x + that.x, y = y + that.y)
  }
}

class Matrix[A: ClassTag](val width: Int, val height: Int, init: A) {
  private val contents: Array[Array[A]] = Array.fill[A](height, width)(init)

  def get(p: Point): A = p match {
    case Point(x, y) => contents(x)(y)
  }

  def set(p: Point, value: A): Matrix[A] = {
    p match {
      case Point(x, y) => contents(x)(y) = value
    }
    this
  }

  def copy: Matrix[A] = {
    val result = new Matrix[A](width = width, height = height, init = init)
    for {
      x <- 0 until width
      y <- 0 until height
    } result.contents(x)(y) = contents(x)(y)
    result
  }

  override def equals(other: Any): Boolean = {
    other match {
      case that: Matrix[t] =>
        that.width == width &&
          that.height == height &&
          (for {
            x <- 0 until width
            y <- 0 until height
          } yield contents(x)(y) == that.contents(x)(y)).forall(b => b)
      case _ => false
    }
  }

  override def hashCode: Int = {
    val p = 41
    val dimHash = p*(width + p) + height
    val contentHashes = for {
      x <- 0 until width
      y <- 0 until height
    } yield contents(x)(y).hashCode
    p*dimHash + contentHashes.foldLeft(p)(_ + p*_)
  }
}

abstract class Topology(val width: Int, val height: Int) {
  require(width > 0, "width must be positive")
  require(height > 0, "height must be positive")

  def mod(number: Int, modulus: Int): Int = {
    val remainder = number % modulus
    if (remainder < 0) remainder + modulus
    else remainder
  }

  def normalize(p: Point): Option[Point]
}

class Cylinder(width: Int, height: Int) extends Topology(width = width, height = height) {
  override def normalize(p: Point): Option[Point] = p match {
    case Point(x, y) =>
      if (y < 0 || y >= height) None
      else Some(Point(x = mod(x, width), y = mod(y, height)))
  }
}

class GameState(width: Int, height: Int) {
  var grid = new Matrix[Option[Player.Value]](width = width, height = height, init = None)
  var isLegalMove = new Matrix[Boolean](width = width, height = height, init = true)
  var player: Player.Value = Player.BLACK
  var prisonersTakenBy: Map[Player.Value, Int] = Map(Player.BLACK -> 0, Player.WHITE -> 0)
  var pastGrids: Set[Matrix[Option[Player.Value]]] = Set(grid.copy)
  var lastPlayPoint: Option[Point] = None
}

class Board(topology: Topology) {
  var state = new GameState(width = topology.width, height = topology.height)
  var pastStates = List(state)

  private val allDirections =
    List(Point(-1, 0), Point(1, 0), Point(0, -1), Point(0, 1))

  private def nextPlayer =
    if (state.player == Player.BLACK) Player.WHITE
    else Player.BLACK

  // Returns an array of all points in the group of the input point if the
  // stone at the input point is dead.
  //
  // If there is no stone at the input point or the stone at the input point
  // is not dead, returns an empty array.
  private def getGroupIfDead(p: Point): Array[Point] = {
    case class SearchEntry(point: Point, directions: List[Point])

    def checkAll(groupPlayer: Player.Value,
                 toCheck: List[SearchEntry],
                 visited: Set[Point]): Set[Point] =
      toCheck match {
        // Nothing left to check, so return the points we've visited.
        case Nil => visited
        // Here there are entries left to check, so check the next one.
        case SearchEntry(point, directions) :: restToCheck =>
          // If there are more directions left for the current point, add
          // a check entry back in for this point with those directions.
          val newToCheck = directions.tail match {
            case restDirections @ _ :: _ =>
              SearchEntry(point, restDirections) :: restToCheck
            case _ => restToCheck
          }
          topology.normalize(point + directions.head) match {
            // Hit the edge of the board in this direction. Continue search.
            case None => checkAll(groupPlayer, newToCheck, visited)
            // There is a neighbor in this direction.
            case Some(neighbor) =>
              state.grid.get(neighbor) match {
                // No stone at this location, so we found a liberty for the
                // group. The group is not dead.
                case None => Set.empty
                // There is a stone at this neighboring position.
                case Some(neighborPlayer) =>
                  // Another stone that is part of this group. Add it to the
                  // search list.
                  if (groupPlayer == neighborPlayer && !visited.contains(neighbor))
                    checkAll(
                      groupPlayer,
                      SearchEntry(neighbor, allDirections) :: newToCheck,
                      visited + neighbor)
                  // An enemy stone. No liberty found yet. Keep searching.
                  else checkAll(groupPlayer, newToCheck, visited)
              }
          }
      }

    state.grid.get(p) match {
      case Some(player) =>
        checkAll(player, List(SearchEntry(p, allDirections)), Set(p)).toArray
      case None => Array.empty
    }
  }

  private def populateLegalMoves(): Unit = {
    def canPlayHere(point: Point): Boolean = {
      state.grid.get(point) match {
        // Illegal to play on top of an existing stone.
        case Some(_) => false
        case None =>
          val boardCopy = new Board(topology)
          boardCopy.state.player = state.player
          for {
            x <- 0 until topology.width
            y <- 0 until topology.height
          } {
            val gridPoint = Point(x = x, y = y)
            boardCopy.state.grid.set(gridPoint, state.grid.get(gridPoint))
          }
          // Illegal to play a move that recreates a former board state.
          boardCopy.play(point, callPopulateLegalMoves = false)
          if (state.pastGrids.contains(boardCopy.state.grid)) false
          else true
      }
    }

    for {
      x <- 0 until this.topology.width
      y <- 0 until this.topology.height
    } {
      val point = Point(x = x, y = y)
      state.isLegalMove.set(point, canPlayHere(point))
    }
  }

  def play(point: Point, callPopulateLegalMoves: Boolean = true): Unit = {
    if (state.isLegalMove.get(point)) {
      // It's legal, so play it.
      state.grid.set(point, Some(state.player))

      // Remove all resulting dead neighbors.
      for (direction <- allDirections) {
        topology.normalize(point + direction) match {
          case Some(neighbor) => for (dead <- getGroupIfDead(neighbor)) {
            state.grid.set(dead, None)
            state.prisonersTakenBy +=
              state.player -> (state.prisonersTakenBy(state.player) + 1)
          }
          case None => ()
        }
      }

      // Remove this group if it killed itself.
      for (dead <- getGroupIfDead(point)) {
        state.grid.set(dead, None)
        state.prisonersTakenBy +=
          nextPlayer -> (state.prisonersTakenBy(nextPlayer) + 1)
      }

      // Update the state to represent this move.
      state.player = nextPlayer
      state.pastGrids += state.grid.copy
      state.lastPlayPoint = Some(point)

      // Recompute the legal moves if required.
      if (callPopulateLegalMoves) {
        populateLegalMoves()
        pastStates = state :: pastStates
      }
    }
  }

  def undo(): Unit = {
    pastStates = pastStates match {
      case currentState :: lastState :: rest =>
        state = lastState
        lastState :: rest
      case _ => pastStates
    }
  }

  def pass(): Unit = {
    state.player = nextPlayer
    pastStates = state :: pastStates
  }
}

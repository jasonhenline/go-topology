package service

import org.scalatest._

class GoServiceSpec extends FlatSpec with Matchers {
  "A Board with a Cylinder Topology" should "identify capture on the edge" in {
    val cylinder = new Cylinder(width = 3, height = 3)
    val board = new Board(cylinder)
    board.play(Point(0, 0))  // black
    board.play(Point(1, 0))  // white
    board.play(Point(2, 0))  // black
    board.pass()             // white
    board.play(Point(1, 1))  // black takes white at Point(1, 0)

    board.state.grid.get(Point(0, 0)) should be (Some(Player.BLACK))
    board.state.grid.get(Point(1, 0)) should be (None)  // white stone was taken
    board.state.grid.get(Point(2, 0)) should be (Some(Player.BLACK))
    board.state.grid.get(Point(0, 1)) should be (None)
    board.state.grid.get(Point(1, 1)) should be (Some(Player.BLACK))
    board.state.grid.get(Point(2, 1)) should be (None)
    board.state.grid.get(Point(0, 2)) should be (None)
    board.state.grid.get(Point(1, 2)) should be (None)
    board.state.grid.get(Point(2, 2)) should be (None)

    board.state.prisonersTakenBy(Player.BLACK) should be (1)
    board.state.prisonersTakenBy(Player.WHITE) should be (0)
  }

  it should "know the legal moves after a capture on the edge" in {
    val cylinder = new Cylinder(width = 3, height = 3)
    val board = new Board(cylinder)
    board.play(Point(0, 0))  // black
    board.play(Point(1, 0))  // white
    board.play(Point(2, 0))  // black
    board.pass()             // white
    board.play(Point(1, 1))  // black takes white at Point(1, 0)

    board.state.isLegalMove.get(Point(0, 0)) should be (false)  // black already here
    board.state.isLegalMove.get(Point(1, 0)) should be (false)  // reproduces old state
    board.state.isLegalMove.get(Point(2, 0)) should be (false)  // black already here
    board.state.isLegalMove.get(Point(0, 1)) should be (true)
    board.state.isLegalMove.get(Point(1, 1)) should be (false)  // reproduces old state
    board.state.isLegalMove.get(Point(2, 1)) should be (true)
    board.state.isLegalMove.get(Point(0, 1)) should be (true)
    board.state.isLegalMove.get(Point(1, 1)) should be (true)
    board.state.isLegalMove.get(Point(2, 1)) should be (true)
  }

  it should "be able to undo a capture on the edge" in {
    val cylinder = new Cylinder(width = 3, height = 3)
    val board = new Board(cylinder)
    board.play(Point(0, 0))  // black
    board.play(Point(1, 0))  // white
    board.play(Point(2, 0))  // black
    board.pass()             // white
    board.play(Point(1, 1))  // black takes white at Point(1, 0)
    board.undo()             // undo the play (and capture)

    board.state.player should be (Player.BLACK)

    board.state.grid.get(Point(0, 0)) should be (Some(Player.BLACK))
    board.state.grid.get(Point(1, 0)) should be (Some(Player.WHITE))  // capture undone
    board.state.grid.get(Point(2, 0)) should be (Some(Player.BLACK))
    board.state.grid.get(Point(0, 1)) should be (None)
    board.state.grid.get(Point(1, 1)) should be (None)
    board.state.grid.get(Point(2, 1)) should be (None)
    board.state.grid.get(Point(0, 2)) should be (None)
    board.state.grid.get(Point(1, 2)) should be (None)
    board.state.grid.get(Point(2, 2)) should be (None)

    board.state.prisonersTakenBy(Player.BLACK) should be (0)
    board.state.prisonersTakenBy(Player.WHITE) should be (0)
  }

  it should "be able to identify a captured group in the middle" in {
    val cylinder = new Cylinder(width = 5, height = 5)
    val board = new Board(cylinder)
    board.play(Point(2, 0))  // black
    board.play(Point(2, 1))  // white
    board.play(Point(2, 3))  // black
    board.play(Point(2, 2))  // white
    board.play(Point(2, 3))  // black
    board.play(Point(1, 1))  // black
    board.pass()             // white
    board.play(Point(1, 2))  // black
    board.pass()             // white
    board.play(Point(3, 1))  // black
    board.pass()             // white
    board.play(Point(3, 2))  // black takes white at (2,1),(2,2)

    board.state.grid.get(Point(0, 0)) should be (None)
    board.state.grid.get(Point(1, 0)) should be (None)
    board.state.grid.get(Point(2, 0)) should be (Player.BLACK)
    board.state.grid.get(Point(3, 0)) should be (None)
    board.state.grid.get(Point(4, 0)) should be (None)
    board.state.grid.get(Point(0, 1)) should be (None)
    board.state.grid.get(Point(1, 1)) should be (Player.BLACK)
    board.state.grid.get(Point(2, 1)) should be (None)
    board.state.grid.get(Point(3, 1)) should be (Player.BLACK)
    board.state.grid.get(Point(4, 1)) should be (None)
    board.state.grid.get(Point(0, 2)) should be (None)
    board.state.grid.get(Point(1, 2)) should be (Player.BLACK)
    board.state.grid.get(Point(2, 2)) should be (None)
    board.state.grid.get(Point(3, 2)) should be (Player.BLACK)
    board.state.grid.get(Point(4, 2)) should be (None)
    board.state.grid.get(Point(0, 3)) should be (None)
    board.state.grid.get(Point(1, 3)) should be (None)
    board.state.grid.get(Point(2, 3)) should be (Player.BLACK)
    board.state.grid.get(Point(3, 3)) should be (None)
    board.state.grid.get(Point(4, 3)) should be (None)
    board.state.grid.get(Point(0, 4)) should be (None)
    board.state.grid.get(Point(1, 4)) should be (None)
    board.state.grid.get(Point(2, 4)) should be (None)
    board.state.grid.get(Point(3, 4)) should be (None)
    board.state.grid.get(Point(4, 4)) should be (None)

    board.state.prisonersTakenBy(Player.BLACK) should be (2)
    board.state.prisonersTakenBy(Player.WHITE) should be (0)
  }
}

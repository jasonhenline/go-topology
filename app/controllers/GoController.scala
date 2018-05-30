package controllers

import javax.inject._
import play.api.data.Form
import play.api.data.Forms._
import play.api.libs.json
import play.api.mvc._
import play.filters.csrf._

// Class for the game creation form.
case class CreateGameInfo(name: String, topology: String, width: Int, height: Int)

// Class for the game joining form.
case class JoinGameInfo(name: String)

/**
 * This controller creates an `Action` to handle HTTP requests to the
 * application's go page.
 */
@Singleton
class GoController @Inject()(cc: ControllerComponents) (implicit assetsFinder: AssetsFinder)
  extends AbstractController(cc) with play.api.i18n.I18nSupport {

  val createGameForm = Form(
    mapping(
      "name" -> nonEmptyText,
      "topology" -> nonEmptyText,
      "width" -> number(min = 1),
      "height" -> number(min = 1)
    )(CreateGameInfo.apply)(CreateGameInfo.unapply)
  )

  val joinGameForm = Form(
    mapping(
      "name" -> nonEmptyText
    )(JoinGameInfo.apply)(JoinGameInfo.unapply)
  )

  // TODO: Protect shared state from concurrent access.
  private val games = scala.collection.mutable.HashMap.empty[String, (service.GoBoard, String, String, Boolean)]

  def go = Action { implicit request =>
    Ok(views.html.gostart(createGameForm, joinGameForm))
  }

  def createGame = Action { implicit request =>
    // Get the game creation info from the form.
    createGameForm.bindFromRequest.fold(
      formWithErrors =>
        BadRequest(views.html.gostart(formWithErrors, joinGameForm)),
      {
        case CreateGameInfo(name, topology, width, height) => {
          if (games.contains(name)) Forbidden("game with this name already exists")
          else {
            val topologyInstance = topology match {
              case "cylinder" => new service.Cylinder(width = width, height = height)
              case "torus" => new service.Torus(width = width, height = height)
              case "mobius" => new service.MobiusStrip(width = width, height = height)
              case "klein" => new service.KleinBottle(width = width, height = height)
              // TODO: Do something in the default case.
            }
            val blackId = java.util.UUID.randomUUID.toString
            val whiteId = java.util.UUID.randomUUID.toString
            val board = new service.GoBoard(topologyInstance)
            games += (name -> (board, blackId, whiteId, false))

            // TODO: How should this URL be returned? Should this be a redirect?
            Redirect(routes.GoController.getGame(blackId))
          }
        }
      }
    )
  }

  def joinGame = Action { implicit request =>
    joinGameForm.bindFromRequest.fold(
      formWithErrors =>
        BadRequest(views.html.gostart(createGameForm, formWithErrors)),
      {
        case JoinGameInfo(name) => {
          if (!games.contains(name)) Forbidden("no such game with that name")
          else if (games(name)._4) Forbidden("that game is full")
          else {
            val game = games(name)
            val whiteId = game._3
            games += name -> (game._1, game._2, game._3, true)
            Redirect(routes.GoController.getGame(whiteId))
          }
        }
      }
    )
  }

  def toJson(board: service.GoBoard, id: String, csrfToken: CSRF.Token): json.JsObject = {
    json.Json.obj(
      "grid" -> json.Json.toJson(board.state.grid.contents),
      "isLegalMove" -> json.Json.toJson(board.state.isLegalMove.contents),
      "player" -> (
        if (board.state.player == service.Player.BLACK) "black" else "white"
      ),
      "prisonersTakenBy" -> json.Json.obj(
        "black" -> board.state.prisonersTakenBy(service.Player.BLACK),
        "white" -> board.state.prisonersTakenBy(service.Player.WHITE)
      ),
      "lastPlayPoint" -> (
        board.state.lastPlayPoint match {
          case Some(point) => json.Json.obj (
            "x" -> point.x,
            "y" -> point.y
          )
          case None => json.JsNull
        }
      ),
      "size" -> json.Json.obj(
        "x" -> board.topology.width,
        "y" -> board.topology.height
      ),
      "topology" -> (
        board.topology match {
          case service.Cylinder(_, _) => "cylinder"
          case service.Torus(_, _) => "torus"
          case service.MobiusStrip(_, _) => "mobius"
          case service.KleinBottle(_, _) => "klein"
          case _ => "unknown"
        }
      ),
      "id" -> id,
      "csrfToken" -> csrfToken.value
    )
  }

  def getGame(id: String) = Action { implicit request =>
    // TODO: Return a page with current state and JS to make move or wait for move.
    val idGameNames = for {
      game @ (name, (_, blackId, whiteId, _)) <- games
      if blackId == id || whiteId == id
    } yield name
    if (idGameNames.isEmpty) Forbidden("No game with this ID exists.")
    else {
      // TODO: Check, there should be at most one matching game.
      val name = idGameNames.head
      val game = games(name)
      Ok(
        views.html.go(
          name = name,
          player = if (game._2 == id) "black" else "white",
          gameState = toJson(game._1, id, CSRF.getToken.get).toString
        )
      )
    }
  }

  def playMove(id: String) = Action { implicit request =>
    // TODO: Check the format of the body.
    val pointArray = request.body.asText.get.split(',').map(_.toInt)
    val idGameNames = for {
      game @ (name, (_, blackId, whiteId, _)) <- games
      if blackId == id || whiteId == id
    } yield name
    if (idGameNames.isEmpty) Forbidden("No game with this ID exists.")
    else {
      // TODO: Check, there should be at most one matching game.
      val name = idGameNames.head
      val game = games(name)
      val board = game._1
      val blackId = game._2
      val whiteId = game._3
      val isActive = game._4
      if (!isActive) Forbidden("This game is not yet active")
      else if (id == blackId && board.state.player != service.Player.BLACK) Forbidden("It is white's turn")
      else if (id == whiteId && board.state.player != service.Player.WHITE) Forbidden("It is black's turn")
      else {
        board.play(service.Point(x = pointArray(0), y = pointArray(1)))
        Ok(toJson(board, id, CSRF.getToken.get))
      }
    }
  }

  def passMove(id: String) = Action { implicit request =>
    val idGameNames = for {
      game @ (name, (_, blackId, whiteId, _)) <- games
      if blackId == id || whiteId == id
    } yield name
    if (idGameNames.isEmpty) Forbidden("No game with this ID exists.")
    else {
      val name = idGameNames.head
      val game = games(name)
      val board = game._1
      val blackId = game._2
      val whiteId = game._3
      val isActive = game._4
      if (!isActive) Forbidden("This game is not yet active")
      else if (id == blackId && board.state.player != service.Player.BLACK) Forbidden("It is white's turn")
      else if (id == whiteId && board.state.player != service.Player.WHITE) Forbidden("It is black's turn")
      else {
        board.pass()
        Ok(toJson(board, id, CSRF.getToken.get))
      }
    }
  }

  def whoseMove(id: String) = Action {
    val idGameNames = for {
      game @ (name, (_, blackId, whiteId, _)) <- games
      if blackId == id || whiteId == id
    } yield name
    if (idGameNames.isEmpty) Forbidden("No game with this ID exists.")
    else {
      // TODO: Check, there should be at most one matching game.
      val name = idGameNames.head
      val game = games(name)
      val board = game._1
      Ok(if (board.state.player == service.Player.BLACK) "black" else "white")
    }
  }

  def getState(id: String) = Action { implicit request =>
    val idGameNames = for {
      game @ (name, (_, blackId, whiteId, _)) <- games
      if blackId == id || whiteId == id
    } yield name
    if (idGameNames.isEmpty) Forbidden("No game with this ID exists.")
    else {
      // TODO: Check, there should be at most one matching game.
      val name = idGameNames.head
      val game = games(name)
      val board = game._1
      Ok(toJson(board, id, CSRF.getToken.get))
    }
  }

}

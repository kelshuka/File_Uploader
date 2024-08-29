const { Router } = require("express");
const indexController = require("../controllers/indexController");
const indexRouter = Router();


indexRouter.get("/", (req, res) => {
    res.render("index", {title: "Home"});
});

indexRouter.get("/sign-up", indexController.createNewUserGet);
indexRouter.post("/sign-up", indexController.createNewUserPost);



indexRouter.get("/log-in", indexController.loginGet);

indexRouter.post("/log-in", indexController.loginPost);

indexRouter.get("/log-out", indexController.logOutGet);

/* indexRouter.get("/admin", indexController.adminGet);
indexRouter.post("/admin", indexController.adminPost); */



module.exports = indexRouter;
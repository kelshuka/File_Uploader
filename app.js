require("dotenv").config();
const express = require('express');
const app = express();


const session = require('express-session');
const passport = require("passport");
const LocalStrategy = require('passport-local').Strategy;

const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const { PrismaClient } = require('@prisma/client');

const db = require('./db/queries');

const handleInternalError = require('./middleware/handleInternalError');



const bcrypt = require('bcryptjs');

const path = require("node:path");

// serving static assets (for the css in this case)
const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));


//app.set("views", path.join(__dirname,"./views"));
app.set("views", path.join(__dirname,"/views"));
app.set("view engine", "ejs");

const indexRouter = require("./routes/indexRouter");
const filesRouter = require("./routes/filesRouter");


app.use(
  session({
    cookie: {
     maxAge: 7 * 24 * 60 * 60 * 1000 // ms
    },
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
    store: new PrismaSessionStore(
      new PrismaClient(),
      {
        checkPeriod: 2 * 60 * 1000,  //ms
        dbRecordIdIsSessionId: true,
        dbRecordIdFunction: undefined,
      }
    )
  })
);

app.use(passport.session());
app.use(express.urlencoded({ extended: false }));




// setting up the LocalStartegy. Authenticating setup
passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await db.findUser("username", username);
        
  
        if (!user) {
          return done(null, false, { message: "Username not found" });
        }

       const match = await bcrypt.compare(password, user.password);
       if (!match){
        // passwords do not match!
        return done(null, false, { message: "Incorrect password" })
       }
        return done(null, user);
      } catch(err) {
        return done(err);
      }
    })
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});
  
passport.deserializeUser(async (id, done) => {
    try {
        const user = await db.findUser("id", id); 
        done(null, user);
    } catch(err) {
        done(err);
    }
});


// Middleware to set locals
app.use( (req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});




app.use("/", indexRouter);
app.use("/drive", filesRouter);

app.get('*', (req, res) => {
  res.render('pageNotFoundError', {title: 'Page Not Found'})
});


app.use(handleInternalError);


const PORT = process.env.PORT || 8080;
app.listen(PORT);


const passport = require("passport");
const asyncHandler = require('express-async-handler');
const { validationResult } = require('express-validator');
const db = require("../db/queries");
const validateSignUp = require('../middleware/validateSignUp');




// Create New Members
const createNewUserGet = asyncHandler( async (req,res) => {
    res.render("forms/signUp", {title: 'Sign Up Form'});
});

const createNewUserPost = [
    //validateGame,
    validateSignUp,
    
    asyncHandler( async (req, res, next) => {
    
        const allErrors = validationResult(req);
        if(!allErrors.isEmpty()){
            return res.status(400).render('forms/signUp',
                {
                    title: "Sign Up Form", errors: allErrors.array(),                 
                });
        };

        await db.signUp(req.body);

        //const user = await db.getUserByUsername(req.body.username);

        //Authenticate the user immdeiately after sign up
        passport.authenticate('local', (err, user, info) => {
            if (err) {
                return next(err); // Handle errors from passport.
            }
            if (!user) {
                //Authentication failed
                return res.render('forms/signUp', {title: "Error", errors: "Authentication fail"});
            }

            // Log the user in
            req.logIn(user, (err) => {
                if (err) {
                    return next(err); // Handle errors from req.logIn
                }
                // Redirect on succesful login
                res.redirect('/drive')
            });
        })(req, res, next);
    }),
];


// Log in members
const loginGet = asyncHandler( async (req,res) => {
    res.render("login", {title: "Posts"});
});

const loginPost = asyncHandler( async (req, res, next) => {

    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err); // Handle errors from passport.
        }
        if (!user) {
            //Authentication failed
            return res.render('login', {title: "Error", errors: "Authentication fail"});
        }

        // Log the user in
        req.logIn(user, (err) => {
            if (err) {
                return next(err); // Handle errors from req.logIn
            }
            // Redirect on succesful login
            res.redirect('/drive')
        });
    })(req, res, next);
});

const logOutGet = asyncHandler( async (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});





module.exports = {
    createNewUserGet,
    createNewUserPost,
    loginGet,
    loginPost,
    logOutGet
};


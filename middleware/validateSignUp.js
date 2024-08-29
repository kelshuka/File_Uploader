const { body } = require('express-validator');

module.exports = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('username cannot be empty!')
    .isLength({ min: 1, max: 255 })
    .withMessage('username must be between 1 and 255 characters'),
  body('email')
    .trim()
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Not a valid e-mail address')
    .isLength({ min: 1, max: 50 })
    .withMessage('Email must be between 1 and 50 characters'),
  body('password')
    .trim()
    .notEmpty()
    .withMessage("Please enter a password")
    .isLength({ min: 4})
    .withMessage("Number of password characters must not be less than 4"),
  body('confirmPassword')
    .custom( (value, { req }) => { return value === req.body.password })
    .withMessage("Passwords not match!"),
];
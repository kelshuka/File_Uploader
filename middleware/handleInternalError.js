module.exports = (err, req, res, next) => {
    //console.log(err);
    console.error(err.stack);
    res.status(500).render('internalError', {title: 'Server Error', error: err});
}
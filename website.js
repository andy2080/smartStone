// =======================
// WEB-Pages =============
// =======================
//config
var config = require('./config');
var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var http = require('http').Server(app);

//Data-Manager
var dataManager = require("./dataManager");

//LED
if (config.LEDsOn) {
    var GpioStone = require('./gpio_stone_wp');
    var gpioStone = new GpioStone();
}
// =======================
// configuration =========
// =======================
var port = process.env.PORT || 8001;
var actuals = null;

//app.use(express.compress());
app.use('/', express.static(__dirname + '/public'));
//4 post
app.use(bodyParser.json())

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

// =======================
// start the server ======
// =======================
var server = http.listen(port, function () {
    var host = server.address().address
    var port = server.address().port
    console.log('HTTP listening on %s:%s', host, port);
    // console.log(config.secret);
});

function errorHandler(err, req, res, next) {
    var code = err.code;
    var message = err.message;
    res.writeHead(code, message, { 'content-type': 'text/plain' });
    res.end(message);
}

// =======================
// Google spreadsheet ====
// =======================
var Spreadsheet = require("./spreadsheet.js");
var spreadsheet = new Spreadsheet();

//init values (actual)
var modules = module.exports = {
    init: function (values) {
        //console.log("init (http)...");
        //console.log(values.temp);
        actuals = values;
        spreadsheet.init(actuals);
    }
};


// =======================
// REST-API ================
// =======================
app.use(function (req, res, next) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    // console.log('Client IP:', ip);
    next();
});

// API ROUTES -------------------
var apiRoutes = express.Router();

//-----------------------------------------------------------------------------------------------------------------------------
//getData
apiRoutes.get('/getData', function (req, res, next) {
    //if(err) res.send(err);
    try {
        res.json(actuals);
    }
    catch (e) {
        console.log(e);
        return next(e);
    }
});

//TEST
apiRoutes.get('/test', function (req, res, next) {
    try {
        res.json({ temp: actuals.KRO.temp, success: true });
    }
    catch (e) {
        console.log(e);
        return next(e);
    }
});

//Reset
apiRoutes.get('/reset', function (req, res, next) {
    try {
        dataManager.ResetMaxMinValues();
        res.json({ OK: true });
    }
    catch (e) {
        console.log(e);
        return next(e);
    }
});

//iPhone App
apiRoutes.get('/setOff/:id', function (req, res, next) {
    //if(err) res.send(err);
    if (gpioStone)
        gpioStone.setOff(req.params.id);
    //res.json("OK");
    res.json({ success: true });
});

apiRoutes.get('/setOn/:id', function (req, res, next) {
    //if(err) res.send(err);
    if (gpioStone)
        gpioStone.setOn(req.params.id);
    //res.json("OK");
    res.json({ success: true });
});

//LED
apiRoutes.get('/getStatus/:id', function (req, res, next) {
    //console.log(req.params.id);
    if (gpioStone)
        gpioStone.read(req.params.id, function (err, pin_value) {
            // console.log(pin_value);
            res.json({ value: pin_value });;
        });
});

apiRoutes.route('/setValue')
    //(accessed at POST http://localhost:8001/api/setValue)
    .post(function (req, res) {
        console.log("PIN --> " + req.body.pin);
        console.log("VAL --> " + req.body.value);
        if (req.body.value == 1) {
            if (gpioStone)
                gpioStone.setOn(req.body.pin);
        }
        else {
            if (gpioStone)
                gpioStone.setOff(req.body.pin);
        }
        res.json({ success: true });
    });

apiRoutes.route('/writeRow')
    //(accessed at POST http://localhost:8001/api/writeRow)
    .post(function (req, res) {
        console.log("---------------------------------------body---------------------------");
        //console.log(req.body);
        console.log(req.body.stone);
        spreadsheet.writeRow();
        res.json({ success: true });
    });


// apply the routes to our application with the prefix /api
app.use('/api', apiRoutes);

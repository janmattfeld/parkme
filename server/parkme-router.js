'use strict';

const router = module.exports = require('express').Router();

const fahrplan = require('fahrplan')("DBhackFrankfurt0316");
const request = require('request');

/*
 * Example: /departures/get?station_id=station_id
 */
router.get('/get', function (req, res) {

    const station_id = req.query.station_id;

    fahrplan.departure.find(station_id).then(function(departures){
      res.send(departures);
    });
})
;

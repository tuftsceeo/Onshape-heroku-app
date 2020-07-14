var express = require('express');
var url = require('url');

exports.renderPage = function(req, res) {
  res.render('valentine');
};
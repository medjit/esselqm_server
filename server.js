console.log("Server is starting...");

const express = require("express");
const serveIndex = require("serve-index");
const path = require("path");
const os = require("os");
const fs = require("fs");

const app = express();
const PORT = 3333;
const MAX_LOG_SIZE = 50 * 1024 * 1024; // 50 MB

let logBuffer = [];
let logSize = 0;

const server = app.listen(PORT, listening);

function listening() {
  console.log("Listening on port " + PORT + "...");
}

function logRequest(req, res, next) {
  let source;
  const cfConnectingIp = req.headers['cf-connecting-ip'];

  if (cfConnectingIp) {
    source = 'Cloudflare Tunnel';
  } else if (req.ip.startsWith('127.') || req.ip.startsWith('::1')) {
    source = 'Local';
  } else {
    source = 'External';
  }

  const logEntry = {
    date: new Date().toISOString(),
    ip: cfConnectingIp || req.ip,
    source: source,
    method: req.method,
    url: req.originalUrl
  };

  const logEntryString = JSON.stringify(logEntry) + os.EOL;
  const logEntrySize = Buffer.byteLength(logEntryString);

  // Add the log entry if it doesn't exceed the max size
  if (logSize + logEntrySize <= MAX_LOG_SIZE) {
    logBuffer.push(logEntryString);
    logSize += logEntrySize;
  } else {
    // If adding the new log entry exceeds the max size, clear the log buffer
    console.log("Log buffer exceeded 50MB, clearing log buffer...");
    logBuffer = [];
    logSize = 0;
  }

  next();
}

// Middleware to log every request
app.use(logRequest);

// Serve static files and directory listings for /data
app.use('/media', express.static(path.join(__dirname, 'media_files')));
app.use('/media', serveIndex(path.join(__dirname, 'media_files'), { 'icons': true }));

// Serve index page from the data directory at the root URL
app.use(express.static(path.join(__dirname, 'frontend')));

// Route to print logs in the browser
app.get('/get_log', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(logBuffer.join(''));
});

//=============================== EsSelqm new frontend functions =================================

//------------------------------- EsSelqm new frontend functions ---------------------------------
console.log("Server is starting...");

const express = require("express");
const serveIndex = require("serve-index");
const path = require("path");
const os = require("os");
const fs = require("fs");
const id3 = require('node-id3');

const app = express();
const PORT = 3333;
const MAX_LOG_SIZE = 50 * 1024 * 1024; // 50 MB

let logBuffer = [];
let logSize = 0;

const server = app.listen(PORT, listening);

function listening() {
  console.log(`Server is running at http://localhost:${PORT}`);
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
app.use('/media_files', express.static(path.join(__dirname, 'media_files')));
app.use('/media_files', serveIndex(path.join(__dirname, 'media_files'), { 'icons': true }));

// Serve index page from the data directory at the root URL
app.use(express.static(path.join(__dirname, 'frontend')));

// Route to print logs in the browser
app.get('/get_log', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(logBuffer.join(''));
});

//=============================== EsSelqm new frontend functions =================================

function getMp3Data(filePath) {
    return new Promise((resolve, reject) => {
        id3.read(filePath, (err, tags) => {
            if (err) {
                return reject(err);
            }

            const mp3Data = {
                album: tags.album || null,
                artist: tags.artist || null,
                comment: tags.comment || null,
                partOfSet: tags.partOfSet || null,
                genre: tags.genre || null,
                title: tags.title || null,
                trackNumber: tags.trackNumber || null,
                year: tags.year || null,
                image: tags.image ? tags.image.imageBuffer.toString('base64') : null
            };

            resolve(mp3Data);
        });
    });
}

let allMp3FilesData = [];

async function scanAllMp3Files(dir) {
    let results = [];
    const list = await fs.promises.readdir(dir, { withFileTypes: true });
    await Promise.all(list.map(async (file) => {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            const subDirResults = await scanAllMp3Files(filePath);
            results = results.concat(subDirResults);
        } else if (file.isFile() && path.extname(file.name) === '.mp3') {
            const mp3Data = await getMp3Data(filePath);
            results.push({
                name: file.name,
                path: filePath.replace(__dirname, '').replace(/\\/g, '/'),
                data: mp3Data
            });
        }
    }));
    return results;
}

async function initializeMp3Data() {
    const audioDir = path.join(__dirname, 'media_files', 'audio');
    try {
        allMp3FilesData = await scanAllMp3Files(audioDir);
        console.log(`Scanned ${allMp3FilesData.length} MP3 files.`);
    } catch (err) {
        console.error("Error scanning audio directory:", err);
    }
}

// Scan all MP3 files when the server starts
initializeMp3Data();

app.get('/print_all_mp3_data', (req, res) => {
    res.json(allMp3FilesData);
});

app.get('/get_lectors', (req, res) => {
    const audioDir = path.join(__dirname, 'media_files', 'audio');

    fs.readdir(audioDir, { withFileTypes: true }, async (err, files) => {
        if (err) {
            console.error("Error reading audio directory:", err);
            return res.status(500).send("Internal Server Error");
        }

        const folders = await Promise.all(files
            .filter(dirent => dirent.isDirectory())
            .map(async dirent => {
                const folderPath = path.join('media_files', 'audio', dirent.name);
                const folderFiles = await fs.promises.readdir(folderPath);
                const folderSize = folderFiles.reduce((total, file) => {
                    const filePath = path.join(folderPath, file);
                    const stats = fs.statSync(filePath);
                    return total + stats.size;
                }, 0);

                let thumbnailBase64 = null;
                const thumbnailPath = path.join(folderPath, 'thumbnail.jpg');
                if (fs.existsSync(thumbnailPath)) {
                    const thumbnailBuffer = fs.readFileSync(thumbnailPath);
                    thumbnailBase64 = thumbnailBuffer.toString('base64');
                }

                return {
                    name: dirent.name,
                    path: folderPath,
                    fileCount: folderFiles.length,
                    size: folderSize,
                    thumbnail: thumbnailBase64
                };
            })
        );

        res.json(folders);
    });
});

app.get('/get_lectures_for', (req, res) => {
    const lectorName = req.query.lector;
    if (!lectorName) {
        return res.status(400).send("Lector name is required");
    }

    const filteredLectures = allMp3FilesData.filter(file => file.data.artist && file.data.artist.toLowerCase() === lectorName.toLowerCase());

    if (filteredLectures.length === 0) {
        return res.status(404).send("Lector not found");
    }

    res.json(filteredLectures);
});

app.get('/get_random', (req, res) => {
    const amount = parseInt(req.query.amount) || 33;

    try {
        const randomFiles = [];
        const usedIndices = new Set();
        while (randomFiles.length < amount && usedIndices.size < allMp3FilesData.length) {
            const randomIndex = Math.floor(Math.random() * allMp3FilesData.length);
            if (!usedIndices.has(randomIndex)) {
                usedIndices.add(randomIndex);
                randomFiles.push(allMp3FilesData[randomIndex]);
            }
        }
        res.json(randomFiles);
    } catch (err) {
        console.error("Error getting random files:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/get_books', (_, res) => {
    const booksDir = path.join(__dirname, 'media_files', 'books');

    fs.readdir(booksDir, { withFileTypes: true }, (err, files) => {
        if (err) {
            console.error("Error reading books directory:", err);
            return res.status(500).send("Internal Server Error");
        }

        const pdfFiles = files
            .filter(dirent => dirent.isFile() && path.extname(dirent.name) === '.pdf')
            .map(dirent => ({
                name: dirent.name,
                path: path.join('media_files', 'books', dirent.name)
            }));

        res.json(pdfFiles);
    });
});

app.get('/get_mp3_data', async (req, res) => {
    const filePath = req.query.filePath;
    if (!filePath) {
        return res.status(400).send("File path is required");
    }

    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
        return res.status(404).send("File not found");
    }

    try {
        const mp3Data = await getMp3Data(fullPath);
        res.json(mp3Data);
    } catch (err) {
        console.error("Error reading MP3 data:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/download_mp3', (req, res) => {
    const fileId = req.query.id;
    if (!fileId) {
        return res.status(400).send("File ID is required");
    }

    const file = allMp3FilesData.find(file => path.basename(file.name, '.mp3') === fileId);
    if (!file) {
        return res.status(404).send("File not found");
    }

    const { artist, title } = file.data;
    const newFileName = `${fileId} - ${artist || 'Unknown Artist'} - ${title || 'Unknown Title'}.mp3`;
    const filePath = path.join(__dirname, file.path);

    res.download(filePath, newFileName, (err) => {
        if (err) {
            console.error("Error downloading file:", err);
            res.status(500).send("Internal Server Error");
        }
    });
});

app.get('/search', (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.status(400).send("Query parameter is required");
    }

    const searchDir = path.join(__dirname, 'media_files');

    async function searchFiles(dir, query) {
        let results = [];
        const list = fs.readdirSync(dir, { withFileTypes: true });
        await Promise.all(list.map(async (file) => {
            const filePath = path.join(dir, file.name);
            if (file.isDirectory()) {
                results = results.concat(await searchFiles(filePath, query));
            } else if (file.isFile() && (path.extname(file.name) === '.mp3' || path.extname(file.name) === '.pdf')) {
                if (file.name.toLowerCase().includes(query.toLowerCase())) {
                    if (path.extname(file.name) === '.mp3') {
                        const fileData = {
                            name: file.name,
                            path: filePath.replace(__dirname, '').replace(/\\/g, '/'),
                            data: await getMp3Data(filePath)
                        };
                        results.push(fileData);
                    } else if (path.extname(file.name) === '.pdf') {
                        const fileData = {
                            name: file.name,
                            path: filePath.replace(__dirname, '').replace(/\\/g, '/')
                        };
                        results.push(fileData);
                    }
                }
            }
        }));
        return results;
    }

    try {
        searchFiles(searchDir, query).then(foundFiles => {
            res.json(foundFiles);
        }).catch(err => {
            console.error("Error searching files:", err);
            res.status(500).send("Internal Server Error");
        });
    } catch (err) {
        console.error("Error searching files:", err);
        res.status(500).send("Internal Server Error");
    }
});
//------------------------------- EsSelqm new frontend functions ---------------------------------
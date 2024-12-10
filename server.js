console.log("Server is starting...");

const express = require("express");
const serveIndex = require("serve-index");
const path = require("path");
const os = require("os");
const fs = require("fs");
const id3 = require('node-id3');
const mp3Duration = require('mp3-duration');

const app = express();
const PORT = 3333;

const server = app.listen(PORT, listening);

function listening() {
  console.log(`Server is running at http://localhost:${PORT}`);
}

// Serve static files and directory listings for /data
app.use('/media_files', express.static(path.join(__dirname, 'media_files')));
app.use('/media_files', serveIndex(path.join(__dirname, 'media_files'), { 'icons': true }));

// Serve index page from the data directory at the root URL
app.use(express.static(path.join(__dirname, 'frontend')));

//=============================== EsSelqm new frontend functions =================================
function getDuration(filePath) {
    return new Promise((resolve, reject) => {
        mp3Duration(filePath, (err, duration) => {
            if (err) {
                return reject(err);
            }

            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            const durationString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            resolve(durationString);
        });
    });
}

function getMp3Data(filePath) {
    return new Promise((resolve, reject) => {
        id3.read(filePath, async (err, tags) => {
            if (err) {
                return reject(err);
            }

            try {
                const durationString = await getDuration(filePath);

                const mp3Data = {
                    album: tags.album || null,
                    artist: tags.artist || null,
                    comment: tags.comment || null,
                    partOfSet: tags.partOfSet || null,
                    genre: tags.genre || null,
                    title: tags.title || null,
                    trackNumber: tags.trackNumber || null,
                    year: tags.year || null,
                    image: tags.image ? tags.image.imageBuffer.toString('base64') : null,
                    duration: durationString
                };

                resolve(mp3Data);
            } catch (durationErr) {
                reject(durationErr);
            }
        });
    });
}

let allMp3FilesData = [];
let isScanning = false;
let count = 0;

function updateMp3FileData(name, filePath, mp3Data) {
    const existingFileIndex = allMp3FilesData.findIndex(file => file.path === filePath.replace(__dirname, '').replace(/\\/g, '/'));
    if (existingFileIndex === -1) {
        allMp3FilesData.push({
            name: name,
            path: filePath.replace(__dirname, '').replace(/\\/g, '/'),
            data: mp3Data,
            timestamp: new Date().toISOString()
        });
    } else {
        const existingFile = allMp3FilesData[existingFileIndex];
        if (JSON.stringify(existingFile.data) !== JSON.stringify(mp3Data)) {
            allMp3FilesData[existingFileIndex] = {
                ...existingFile,
                data: mp3Data,
                timestamp: new Date().toISOString()
            };
        }
    }
}

async function scanAllMp3FilesIncremental(dir) {
    const list = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const file of list) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
            await scanAllMp3FilesIncremental(filePath);
        } else if (file.isFile() && path.extname(file.name) === '.mp3') {
            try {
                const mp3Data = await getMp3Data(filePath);
                count++;
                console.log(count + " - Scanned: " + file.name);
                updateMp3FileData(file.name, filePath, mp3Data);
            } catch (err) {
                console.error(`Error scanning file ${file.name}:`, err);
            }
        }
    }
}

async function initializeMp3DataIncremental() {
    if (isScanning) {
        console.log("Scanning is already in progress...");
        return;
    }
    isScanning = true;

    const audioDir = path.join(__dirname, 'media_files', 'audio');
    try {
        await scanAllMp3FilesIncremental(audioDir);
        console.log(`Finished scanning ${allMp3FilesData.length} MP3 files.`);
        const dataFilePath = path.join(__dirname, 'allMp3FilesData.json');
        await fs.promises.writeFile(dataFilePath, JSON.stringify(allMp3FilesData, null, 2));
        console.log(`MP3 data saved to ${dataFilePath}`);
    } catch (err) {
        console.error("Error during scanning:", err);
    } finally {
        isScanning = false;
    }
}


async function loadMp3DataFromFile() {
    const dataFilePath = path.join(__dirname, 'allMp3FilesData.json');
    try {
        const data = await fs.promises.readFile(dataFilePath, 'utf8');
        const parsedData = JSON.parse(data);

        allMp3FilesData = await Promise.all(parsedData.map(async (file) => {
            const filePath = path.join(__dirname, file.path);
            if (fs.existsSync(filePath)) {
                return file;
            } else {
                console.warn(`File not found: ${filePath}`);
                return null;
            }
        }));

        allMp3FilesData = allMp3FilesData.filter(file => file !== null);
        console.log(`Loaded ${allMp3FilesData.length} MP3 files from ${dataFilePath}`);
    } catch (err) {
        console.error("Error loading MP3 data from file:", err);
    }

    // Trigger the incremental scan
    initializeMp3DataIncremental();
}

// Load MP3 data from file on startup
loadMp3DataFromFile();

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

    const file = allMp3FilesData.find(file => file.path === filePath);
    if (!file) {
        return res.status(404).send("File not found");
    }

    try {
        const mp3Data = allMp3FilesData.find(file => file.path === filePath);
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

    const lowerCaseQuery = query.toLowerCase();
    const results = allMp3FilesData.filter(file => {
        const fileData = { ...file.data };
        delete fileData.image;
        return Object.values(fileData).some(value => 
            value && value.toString().toLowerCase().includes(lowerCaseQuery)
        ) || file.name.toLowerCase().includes(lowerCaseQuery);
    });

    res.json(results);
});

app.get('/print_scanned_mp3_files', (req, res) => {
    let responseText = '';
    for (let i = 0; i <= 65535; i++) {
        const fileId = i.toString().padStart(5, '0');
        const file = allMp3FilesData.find(file => path.basename(file.name, '.mp3') === fileId);
        if (file) {
            responseText += `${fileId} - ${file.data.artist || 'Unknown Artist'} - ${file.data.title || 'Unknown Title'}\n`;
        } else {
            responseText += `${fileId}\n`;
        }
    }
    res.setHeader('Content-Type', 'text/plain');
    res.send(responseText);
});
//------------------------------- EsSelqm new frontend functions ---------------------------------
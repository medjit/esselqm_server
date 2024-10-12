// If using Cloudflared hosted frontend, set API_ADDRESS to 'https://api.esselqm.com/'
// If using localhost, set API_ADDRESS to '/'
const API_ADDRESS = '/';

document.getElementById('hamburger').addEventListener('click', function() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('show');
});

document.getElementById('theme-toggle').addEventListener('click', function() {
    const body = document.body;
    const currentTheme = body.classList.contains('novel-theme') ? 'novel' : 'storybook';
    const newTheme = currentTheme === 'novel' ? 'storybook' : 'novel';
    body.classList.remove(`${currentTheme}-theme`);
    body.classList.add(`${newTheme}-theme`);
    localStorage.setItem('theme', newTheme);
});

async function checkAPIStatus() {
    try {
        const response = await fetch(API_DDRESS);
        if (!response.ok) {
            throw new Error('API not accessible');
        }
    } catch (error) {
        window.location.href = 'technicalservice.html';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    checkAPIStatus();
});
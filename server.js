window.onload = function() {
    if (window.location.pathname === '/technicalservice.html') {
        const apiUrl = 'https://your-api-endpoint.com/healthcheck';

        function checkConnection() {
            fetch(apiUrl)
                .then(response => {
                    if (response.ok) {
                        window.location.href = 'main.html';
                    } else {
                        console.error('API is not available');
                    }
                })
                .catch(error => {
                    console.error('Error connecting to the API:', error);
                });
        }

        // Check connection immediately on load
        checkConnection();

        // Check connection every minute (60000 milliseconds)
        setInterval(checkConnection, 60000);
    }
};
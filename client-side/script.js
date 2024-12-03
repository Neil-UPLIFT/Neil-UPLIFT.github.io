const tickets = JSON.parse(localStorage.getItem('tickets')) || [];

// Handle ticket submission
document.getElementById('ticketForm')?.addEventListener('submit', function(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const request = document.getElementById('request').value;

    tickets.push({ username, request });
    localStorage.setItem('tickets', JSON.stringify(tickets));
    alert('Ticket submitted successfully!');
    document.getElementById('ticketForm').reset();
});

// Handle admin login
document.getElementById('loginForm')?.addEventListener('submit', function(event) {
    event.preventDefault();
    const adminUsername = document.getElementById('adminUsername').value;
    const adminPassword = document.getElementById('adminPassword'). value;

    // Simple authentication check (replace with a more secure method in production)
    if (adminUsername === 'admin' && adminPassword === 'password') {
        document.getElementById('loginForm').style.display = 'none';
        const ticketList = document.getElementById('ticketList');
        tickets.forEach(ticket => {
            const listItem = document.createElement('li');
            listItem.textContent = `${ticket.username}: ${ticket.request}`;
            ticketList.appendChild(listItem);
        });
        document.getElementById('tickets').style.display = 'block';
    } else {
        alert('Invalid username or password');
    }
});
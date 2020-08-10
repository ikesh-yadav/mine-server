//var io = require('socket.io').listen(8080);
let proc = require('child_process');

const cors = require('cors');
const express = require("express");
const path = require("path");

const app = express();
const server = require('http').createServer(app);
const options = { /* ... */ };
const io = require('socket.io')(server, options);

const port = process.env.PORT || 3000;
let status = 'Stopped';
let mc_server = null;
let console_stuff = [];

app.use(cors());

app.use(express.static(path.join(__dirname, "/static/")));

app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "/static", "/mp.html")); } );

server.listen(port, (err) => {
	if(err) {console.log(err);return;}
    console.log("Server started at port: "+port)
})

io.on('start_server', () => {
	console.log('start server random input');
});

io.on('connection', function(socket) {

	/*
	servers = {single: "Single Player"}

	socket.on('get_server_list', function(){
		socket.emit('server_list', servers);
	});
	*/

	socket.on('get_status', function(){
		socket.emit('status', status);
	});

	// When the client says to start a server...
	socket.on('start_server', () => {
		
		// If a server is already running or server doesn't exist
		if (mc_server ) {
			// Let the user know that it failed.
			socket.emit('fail', 'start_server');
			// Stop execution of this callback
			return;
		}
		console.log("starting server");
		//console.log(process.stdout);

		//process.stdout.write('start server request recieved');
		// Set which server is currently running

		//Change status of server to starting
		status = 'Starting' ;
		io.sockets.emit('status', status);

		// Start the Minecraft Server
		mc_server = proc.spawn(
			// Uses Java to run the server from a command line child process. The command prompt will not be visible.
			"java",
			['-Xms1024M', '-Xmx1024M', '-jar', 'server.jar', 'nogui']
		);

		// status = 'Starting' ;
		// io.sockets.emit('status', status);

		mc_server.stdout.on('data', function (data) {
			//console.log('got data from minecraft spawn')
			if (data) {
				//process.stdout.write(data);
				if(data == 'Done'){
					io.sockets.emit('status', "Running");
				}

				io.sockets.emit('console', ""+data);
				console_stuff.push(data);
			}
		});

		mc_server.stderr.on('data', function (data) {
			if (data) {
				io.sockets.emit('console', ""+data);
			}
		});

		mc_server.on('exit', function () {
			mc_server = null;
			io.sockets.emit('status', 'Stopped');
		});

		

	}); // End .on('start_server')


	socket.on('command', function(cmd) {
		if (mc_server) {
			io.sockets.emit('console', "Player Command: " + cmd);
			mc_server.stdin.write(cmd + "\r");
		} else {
			socket.emit('fail', cmd);
		}
	});

	socket.on('stop_server', () => {
		if(mc_server) {
			mc_server.stdin.write('stop'+"\r");
		} else {
			socket.emit('fail','server already stopped');
		}
	});
});



// Allows me to type commands into the Console Window to control the MC Server
process.stdin.resume();
process.stdin.on('data', function (data) {
	if (mc_server) {
		mc_server.stdin.write(data);
	}
});


// process.stdout.on('data', (data)=> {
// 	console.log('got data from main process');
// 	socket.emit('process_stdout', data);
// });
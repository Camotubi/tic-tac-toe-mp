import {createServer} from 'node:http';
import {Mutex} from 'async-mutex';
import {readFile} from 'node:fs/promises';

const game = {
	board: [[0,0,0],[0,0,0],[0,0,0]],
	currentPlayer: -1,
}

/**
 * @param {Array.<Array.<number>>} board
 * @param {number} player
 * @param {Array.<number>} playerMove
 */
function isGameOver(board, player, playerMove){
	let col, row, diag, rdiag = 0;
	for(let i = 0; i < 3; ++i) {

		console.log(playerMove);
		console.log(i);
		if (board[playerMove[0]][i] == player) {
			col += 1;
		}
		if (board[i][playerMove[1]] == player) {
			row += 1;
		}
		if (board[i][i] == player) {
			diag += 1;
		}
		if (board[i][2 - i] == player) {
			rdiag += 1;
		}

	}

	if (row == 3 || col == 3 || diag == 3 || rdiag == 3) {
		return player;
	}
	return 0;

}

/** @typedef {import('node:http').IncomingMessage} Request */
/** @typedef {import('node:http').ServerResponse} Response */

const port = 42069;
const host = '0.0.0.0';
let mutex = new Mutex();

/**
 * @param {Request} req
 */
function router(req, res) {
	console.log(req.url);
	if(req.url == '/'){
		index(req, res);
	} else if(req.url== '/events') {
		events(req, res);
	} else if(req.url == '/client.js') {
		serveClient(req, res);
	} else if(req.url == '/play') {
		play(req, res);
	}
	
}

/**
 * Retorna el html del juego c:
 * @param {Request} req
 * @param {Response} res
 */
function index(_req, res) {
	mutex.runExclusive(() => {
		if(game.currentPlayer >= 1) {
			res.writeHead(404);
			return;
		} 

		return readFile('./index.tmpl.html')
			.then(file => {
				let fileStr = file.toString();
				let currentPlayer = null;
				if(game.currentPlayer == -1) {
					currentPlayer = 1;
				} else {
					currentPlayer = 2;
				}
				game.currentPlayer += 1;
				
				fileStr = fileStr.replace('$currentPlayer', currentPlayer);
				res.writeHead(200, {headers: {'Content-Type': 'text/html'}});
				res.write(fileStr);

			});
		/*
		res.write(`<html>

		<form action="/play"> <input hidden name='player' value='${currentPlayer}' > <button name="move" value="0:0">
				<button name="move" value="0:0"> <button name="move" value="0:1"> <button name="move" value="0:2">
				<button name="move" value="1:0"> <button name="move" value="1:1"> <button name="move" value="1:2">
				<button name="move" value="2:0"> <button name="move" value="2:1"> <button name="move" value="2:0">
			</form>

			</html>`);
			*/
	}).finally(() => res.end())
}
/**
 * @param {Request} req
 * @param {Response} res
 */
function serveClient(_req, res) {
	readFile('./client.js')
		.then(file => {
			res.writeHead(200, {
				'Content-Type': 'application/javascript'
			});
			res.write(file.toString());


		}).finally(() => res.end());
	

}

/**
 * Inicia SSE de eventos del juego.
 * @param {Request} req
 * @param {Response} res
 */
function events(_req, res) {
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
	});
	const fn = () => {
		mutex.acquire().then(() =>{
		res.write(`data: ${JSON.stringify(game)}\n\n`);
		setTimeout(fn, 1000);
		}).finally(() => mutex.release())
	};
	fn();

}

/**
 * @param {Request} req
 * @param {Response} res
 */
function play(req, res) {
	let body = '';
	console.log('play handler');
	req.on('data', (chunk) => {
		body += chunk;
		console.log('data');
	});
	req.on('end', () => {
		try{
			console.log('all response');
		const payload = JSON.parse(body);
			console.log(payload);
		const move = payload.move.split(':').map((x) => parseInt(x, 10));
		mutex.runExclusive(() => {
			game.board[move[0]][move[1]] = payload.player;
			isGameOver(game.board, payload.player, move);
			game.currentPlayer = game.currentPlayer  == 1 ? 2: 1;
		});
		res.write('OK'); 
		res.end(); 
		} catch{
			res.end();
		}
	});
	
}

const server = createServer(router);


server.listen(port, host, () => {
	console.log(`🖥️ TAMO ESCUCHANDO EN ${host}:${port}`);
})

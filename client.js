const button = document.querySelector('button');
const formElement = document.querySelector('form');
formElement.addEventListener('submit', event => {
  event.preventDefault();
  // actual logic, e.g. validate the form
  console.log('Form submission cancelled.');
});
const evtSource = new EventSource('/events');
const eventList = document.querySelector('ul');
let state = null;

  evtSource.onopen = function() {
    console.log("Connection to server opened.");
  };

  evtSource.onmessage = function(e) {
    const newElement = document.createElement("li");

     
    newElement.textContent = "message: " + e.data;
    state = JSON.parse(e.data);
    render(state);
  };

  evtSource.onerror = function() {
    console.log("EventSource failed.");
  };


function render(state) {
	if(state === null) {
		return;
	}
	const form = document.querySelector('form');
	form.replaceChildren();
	for(let x = 0; x < 3; x++) {
		for(let y = 0; y < 3; y++) {
			const button = document.createElement('button');	
			button.innerText = state.board[x][y];
			button.name = 'move';
			button.type = 'button';
			button.value = `${x}:${y}`;
			button.addEventListener('click', play);
			button.disabled = window.player != state.currentPlayer;
			button.className ="button";
			form.appendChild(button);

			
		}
	}


}

function play(event) {
	const move = event.target.value;
	fetch('/play', {
		method: 'POST',
		headers: {'Content-Type': 'applicaton/json'},
		body: JSON.stringify({player: window.player, move})
	})


}
console.log('DESDE EL BROWSER')

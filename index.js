const PORT = 7777;

let http = require('http');
let static = require('node-static');
let ws = require('ws');

let file = new static.Server('./public');

let http_server = http.createServer(function (request, response) {
    request.addListener('end', function () {
        file.serve(request, response);
    }).resume();
}).listen(PORT);

console.log(`Servidor HTTP iniciado en el puerto ${PORT}`);

let ws_server = new ws.Server({ server: http_server });

console.log("Servidor WebSocket iniciado");

let player1, player2;
let spectators = [];

ws_server.on('connection', function (conn) {
    console.log("Nueva conexi�n WebSocket recibida");
    console.log(`N�mero de conexiones actuales: ${ws_server.clients.size}`);

    if (player1 == null) {
        player1 = conn;
        console.log("Asignado como Player 1");

        let info = {
            player_num: 1
        };

        player1.send(JSON.stringify(info));

        player1.on('close', function () {
            console.log("Player 1 desconectado");
            if (player2) {
                let data = {
                    opponent_disconnected: true
                };
                player2.send(JSON.stringify(data));
            }
            spectators.forEach(function (spec) {
                spec.send(JSON.stringify({ player_disconnected: 1 }));
            });
            player1 = null;
        });

        player1.on('message', function (msg) {
            console.log("Mensaje recibido de Player 1:", msg);
            if (player2 == null) return;

            let info = JSON.parse(msg);
            if (info.y != null) {
                player2.send(JSON.stringify(info));
                sendToSpectators(info);
            }
            else if (info.by != null) {
                player2.send(JSON.stringify(info));
                sendToSpectators(info);
            }
            else if (info.s1 != null) {
                player2.send(JSON.stringify(info));
                sendToSpectators(info);

                if (info.s1 >= 3 || info.s2 >= 3) {
                    let data = {
                        game_over: true,
                        winner: 0
                    };
                    if (info.s1 >= 3)
                        data.winner = 1;
                    else
                        data.winner = 2;

                    let data_json = JSON.stringify(data);

                    player1.send(data_json);
                    player2.send(data_json);
                    sendToSpectators(data);

                    return;
                }
            }
        });
    }
    else if (player2 == null) {
        player2 = conn;
        console.log("Asignado como Player 2");

        let info = {
            player_num: 2
        };
        player2.send(JSON.stringify(info));

        player2.on('close', function () {
            console.log("Player 2 desconectado");
            if (player1) {
                let data = {
                    opponent_disconnected: true
                };
                player1.send(JSON.stringify(data));
            }
            spectators.forEach(function (spec) {
                spec.send(JSON.stringify({ player_disconnected: 2 }));
            });
            player2 = null;
        });

        setTimeout(function () {
            let info = {
                game_start: true
            };

            let info_json = JSON.stringify(info);

            player1.send(info_json);
            player2.send(info_json);
            sendToSpectators(info);

        }, 500);

        player2.on('message', function (msg) {
            console.log("Mensaje recibido de Player 2:", msg);
            if (player1 == null) return;
            let info = JSON.parse(msg);
            if (info.y != null) {
                player1.send(JSON.stringify(info));
                sendToSpectators(info);
            }
        });
    }
    else {
        console.log("Nuevo espectador conectado");
        spectators.push(conn);
        let info = {
            spectator: true
        };
        conn.send(JSON.stringify(info));

        if (player1 && player2) {
            let game_info = {
                game_start: true
            };
            conn.send(JSON.stringify(game_info));
        }

        conn.on('close', function () {
            console.log("Espectador desconectado");
            spectators = spectators.filter(function (spec) {
                return spec !== conn;
            });
        });
    }
});

function sendToSpectators(data) {
    spectators.forEach(function (spec) {
        spec.send(JSON.stringify(data));
    });
}
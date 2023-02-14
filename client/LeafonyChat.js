/**
 * サービスのUUID
 * @type {string}
 */
const SERVICE_UUID = "442f1570-8a00-9a28-cbe1-e1d4212d53eb";

/**
 * 読み取りのキャラクタリスティックのUUID
 * @type {string}
 */
const READ_CHARACTERISTIC_UUID = "442f1571-8a00-9a28-cbe1-e1d4212d53eb";

/**
 * 書き込みのキャラクタリスティックのUUID
 * @type {string}
 */
const WRITE_CHARACTERISTIC_UUID = "442f1572-8a00-9a28-cbe1-e1d4212d53eb";

/**
 * メッセージの種類
 * @type {{[key: string]: number}}
 */
const MESSAGE_TYPE = {SEND: 0, RECEIVE: 1};

/**
 * 書き込みのキャラクタリスティック
 * @type {BluetoothRemoteGATTCharacteristic|undefined}
 */
let WriteCharacteristic;

/**
 * 接続しているBluetoothデバイスのオブジェクト
 * @type {BluetoothDevice|undefined}
 */
let Device;

/**
 * 「Bluetooth接続」ボタンをクリックした時の関数
 */
function onBluetoothConnectButtonClick() {
    navigator.bluetooth.requestDevice({
        filters: [{
            name: ["Leafony"]
        }],
        optionalServices: [SERVICE_UUID]
    }).then((device) => {
        document.getElementById("bluetooth_connect_button").disabled = true;
        document.getElementById("bluetooth_disconnect_button").disabled = false;
        Device = device;
        console.group("Bluetoothデバイスに接続しました。");
        console.debug(`ユニーク名: ${device.name}`);
        console.debug(`ID: ${device.id}`);
        console.groupEnd();
        device.addEventListener("gattserverdisconnected", () => {
            document.querySelector("#chat_area > input").disabled = true;
            document.querySelector("#chat_area > button").disabled = true;
            console.info("Bluetoothデバイスから切断されました。");
        }, {once: true});
        //GATTサーバに接続する。
        device.gatt.connect().then((server) => {
            console.info("GATTサーバに接続しました。");
            //サービスに接続する。
            server.getPrimaryService(SERVICE_UUID).then((service) => {
                console.info("プライマリサービスに接続しました。");
                //読み取りのキャラクタリスティック
                service.getCharacteristic(READ_CHARACTERISTIC_UUID).then((characteristic) => {
                    characteristic.addEventListener("characteristicvaluechanged", (event) => {
                        insertChatMessage(new TextDecoder("utf-8").decode(event.target.value), MESSAGE_TYPE.RECEIVE);
                        console.info("キャラクタリスティックが変化しました。");
                    });
                    characteristic.startNotifications();
                });
                //書き込みのキャラクタリスティック
                service.getCharacteristic(WRITE_CHARACTERISTIC_UUID).then((characteristic) => {
                    document.querySelector("#chat_area > input").disabled = false;
                    document.querySelector("#chat_area > button").disabled = false;
                    WriteCharacteristic = characteristic;
                });
            });
        });
    }).catch((error) => {
        switch(error.name) {
            case "NotFoundError":
                console.info("ユーザがBluetoothデバイスの選択をキャンセルしました。");
                break;
            default:
                console.error(`Bluetoothデバイスの選択準備時にエラーが発生しました。${error.message}`);
        }
    });
}

/**
 * 「Bluetooth切断」ボタンをクリックした時の処理
 */
function onBluetoothDisconnectButtonClick() {
    if(Device) {
        Device.gatt.disconnect();
        console.info("Bluetoothデバイスとの通信を切断しました。");
        Device = undefined;
        WriteCharacteristic = undefined;
    }
    document.getElementById("bluetooth_connect_button").disabled = false;
    document.getElementById("bluetooth_disconnect_button").disabled = true;
}

/**
 * メッセージ入力のテキストボックスでキーが押された時の処理
 */
function onKeypressInMessageInput(event) {
    if(event.keyCode == 13) sendMessage();
}

/**
 * 「クリア」ボタンをクリックした時の処理
 */
function onClearButtonClick() {
    const chatMessageBody = document.getElementById("chat_message_body");
    while(chatMessageBody.firstElementChild) chatMessageBody.removeChild(chatMessageBody.firstElementChild);
}

/**
 * Leafonyにコマンドを送信する。
 * @param {string} command 送信する文字列
 */
function sendCommand(command) {
    if(WriteCharacteristic) WriteCharacteristic.writeValue(new TextEncoder().encode(command)).then(() => console.info("Bluetoothデバイスにメッセージを送信しました。"));
    else console.warn("Bluetoothデバイスに接続されていないため、メッセージを送信できませんでした。");
}

/**
 * メッセージをメッセージリストに挿入する。
 * @param {string} message 挿入するメッセージ
 * @param {MESSAGE_TYPE} messageType メッセージの種類
 */
function insertChatMessage(message, messageType) {
    const chatMessageBody = document.getElementById("chat_message_body");
    const messageEntry = document.createElement("p");
    switch(messageType) {
        case MESSAGE_TYPE.SEND:
            messageEntry.innerHTML = `<span class="red_color"><-</span> ${message}`;
            break;
        case MESSAGE_TYPE.RECEIVE:
            messageEntry.innerHTML = `<span class="green_color">-></span> ${message}`;
            break;
    }
    messageEntry.classList.add("chat_message", chatMessageBody.childElementCount % 2 == 0 ? "chat_message_primary" : "chat_message_secondary");
    chatMessageBody.appendChild(messageEntry);
}

/**
 * メッセージ送信処理
 */
function sendMessage() {
    const messageBox = document.querySelector("#chat_area > input");
    sendCommand(messageBox.value);
    insertChatMessage(messageBox.value, MESSAGE_TYPE.SEND);
    messageBox.value = "";
}

//WebがBluetooth APIに対応しているかどうか確認する。
if(navigator.bluetooth) console.info("お使いのブラウザはBluetooth APIに対応しています。");
else {
    console.warn("お使いのブラウザはBluetooth APIに対応していません。Google Chromeの場合は \"chrome://flags/#enable-experimental-web-platform-features\" を検索バーに入力するとBluetooth APIを有効化出来る場合があります。");
    document.getElementById("bluetooth_area").classList.add("hidden");
    document.getElementById("bluetooth_api_not_supported").classList.remove("hidden");
}

//"copyable_text"クラスのテキストをコピー出来るようにする処理
/**
 * マウスカーソルが"copyable_text"クラス内にある時に動いた時の関数
 * @param {MouseEvent} event イベント
 */
function onMouseMoveInCopyableTextClass(event) {
    const balloonText = document.getElementById("balloon_text");
    balloonText.style.left = `${event.clientX - balloonText.clientWidth / 2}px`;
    balloonText.style.top = `${event.clientY - 70}px`;
}

Array.prototype.forEach.call(document.getElementsByClassName("copyable_text"), (element) => {
    let timeoutID;
    element.addEventListener("mouseenter", () => {
        const balloonText = document.getElementById("balloon_text");
        balloonText.innerText = "クリックしてコピー";
        balloonText.classList.remove("hidden");
        element.addEventListener("mousemove", onMouseMoveInCopyableTextClass);
    });
    element.addEventListener("mouseleave", () => {
        const balloonText = document.getElementById("balloon_text");
        balloonText.classList.add("hidden");
        balloonText.classList.remove("balloon_text_green", "balloon_text_red");
        element.removeEventListener("mousemove", onMouseMoveInCopyableTextClass);
        if(timeoutID) clearTimeout(timeoutID);
        timeoutID = undefined;
    });
    element.addEventListener("click", (event) => {
        const balloonText = document.getElementById("balloon_text");
        navigator.clipboard.writeText("chrome://flags/#enable-experimental-web-platform-features").then(() => {
            balloonText.innerText = "コピーしました！";
            balloonText.classList.add("balloon_text_green");
        }).catch(() => {
            balloonText.innerText = "コピーエラー！";
            balloonText.classList.add("balloon_text_red");
        }).finally(() => {
            onMouseMoveInCopyableTextClass(event);
            timeoutID = setTimeout(() => {
                balloonText.innerText = "クリックしてコピー";
                balloonText.classList.remove("balloon_text_green", "balloon_text_red");
                onMouseMoveInCopyableTextClass(event);
            }, 1500);
        });
    });
});
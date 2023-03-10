//ライブラリのインクルード
#include <SoftwareSerial.h>
#include <TBGLib.h>

//** 定数 **
//ピン番号
#define BLE_INTERRUPT_PIN 2 //BLE割り込みピン
#define BLE_RESET_PIN 6 //BLEリセットピン
#define BLE_WAKEUP_PIN 7 //BLE起動ピン
#define BLE_TX 15 //BLEシリアルピン（送信）
#define BLE_RX 16 //BLEシリアルピン（受信）

//** グローバル変数 **
//設定
const String Device_Name = "Leafony"; //Bluetoothに載せるデバイス名

//BLE
SoftwareSerial Serial_BLE(BLE_RX, BLE_TX);
BGLib BLE((HardwareSerial *)&Serial_BLE, 0, 0);
bool BLE_Connected = false; //BLEが接続されているかどうか。

//シリアル文字入力
bool Serial_Available_Previous = false; //前ループにシリアルで文字を受信したかどうか
char Input_Message[128]; //受信した文字列のバッファ
uint8_t Input_Message_Pointer = 0; //メッセージのポインター

//** グローバル関数 **
void setup() {
  Serial.begin(9600); //シリアル通信の開始
  Serial.println("Setup start");

  //ピンのセットアップ
  pinMode(BLE_INTERRUPT_PIN, INPUT);
	pinMode(BLE_RESET_PIN, OUTPUT);
	pinMode(BLE_WAKEUP_PIN, OUTPUT);
	digitalWrite(BLE_WAKEUP_PIN, HIGH);

  //BLEライブラリのイベント関数
  //機器が接続された時
  BLE.ble_evt_le_connection_opend = []() {
    Serial.println("Connection opened");
    BLE_Connected = true;
  };
  //機器が切断された時
  BLE.ble_evt_le_connection_closed = []() {
    Serial.println("Connection closed");
    BLE.ble_cmd_le_gap_start_advertising(0, LE_GAP_USER_DATA, LE_GAP_UNDIRECTED_CONNECTABLE);
    BLE_Connected = false;
  };
  //BLEから受信した時
  BLE.ble_evt_gatt_server_attribute_value = [](const struct ble_msg_gatt_server_attribute_value_evt_t *message) {
    Serial.print("-> ");
    for(uint8_t i = 0; i < message -> value.len; i++) Serial.print((char)message -> value.data[i]);
    Serial.println();
  };

  //BLEのセットアップ
  Serial_BLE.begin(9600); //BLEシリアルの開始
  BLE.ble_cmd_le_gap_set_adv_parameters(400, 800, 7); //Advertising Intervalの設定（引数1: 最小インターバル（400 * 0.625ms = 250ms）、引数2: 最大インターバル（800 * 0.625ms = 500ms））
  /*
    Advertisingパケットを発信する周期をAdvertising Intervalという。
    仕様では0.625ms刻みで20msから10.24sまでの範囲と定められている。
    但し、AdvertisingイベントがADV_NONCONN_INDかADV_SCAN_INDである場合は、Advertising Intervalが100ms未満であってはならない。
    （詳しくは、pp.69-70参照）
  */
  while(BLE.checkActivity(1000)); //受信チェック
  BLE.ble_cmd_system_get_bt_address();
  while(BLE.checkActivity(1000)); //受信チェック
  Serial.println("Setup end");

  //======================
  //Advertisingデータの設定
  uint8_t advertising_data[31]; //Advertisingのデータ（最大31オクテット）
	uint8_t advertising_data_pointer = 0; //Advertisingのデータの格納場所を指し示す変数

	//AD Structure 1（フラグ）
	advertising_data[advertising_data_pointer++] = 0x02; //フィールドの長さ
	advertising_data[advertising_data_pointer++] = BGLIB_GAP_AD_TYPE_FLAGS; //データタイプ
	advertising_data[advertising_data_pointer++] = 0b110; //LE 一般検出可能モード、Bluetooth Classic 非対応

	//AD Structure2（デバイス名）
	advertising_data[advertising_data_pointer++] = Device_Name.length() + 1; //フィールドの長さ
	advertising_data[advertising_data_pointer++] = BGLIB_GAP_AD_TYPE_LOCALNAME_COMPLETE;  //データタイプ
	for(int i = 0; i < Device_Name.length(); i++) advertising_data[advertising_data_pointer++] = Device_Name.charAt(i); //デバイス名を1文字ずつ格納

	//Advertisingデータの登録
  BLE.ble_cmd_le_gap_set_adv_data(SCAN_RSP_ADVERTISING_PACKETS, advertising_data_pointer, advertising_data);
	while(BLE.checkActivity(1000)); //受信チェック

	//Advertising開始
  Serial.println("Start advertising");
  BLE.ble_cmd_le_gap_start_advertising(0, LE_GAP_USER_DATA, LE_GAP_UNDIRECTED_CONNECTABLE); //接続可・非指向性
	while(BLE.checkActivity(1000)); //受信チェック
}

void loop() {
  if(Serial.available() > 0) {
    Input_Message[Input_Message_Pointer++] = Serial.read();
    Serial_Available_Previous = true;
  }
  else if(Serial_Available_Previous) {
    if(BLE_Connected) {
      BLE.ble_cmd_gatt_server_send_characteristic_notification(1, 0x000C, Input_Message_Pointer - 1, (const uint8_t *)Input_Message); //BLE接続されている場合はBLE送信
      Serial.print("<- ");
      for(uint8_t i = 0; i < Input_Message_Pointer - 1; i++) Serial.print(Input_Message[i]);
      Serial.println();
    }
    Serial_Available_Previous = false;
    Input_Message_Pointer = 0;
  }
  BLE.checkActivity(0); //BLEの状態の確認
  delay(10);
}
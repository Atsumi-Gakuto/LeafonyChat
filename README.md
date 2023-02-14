# Leafony_Chat
Leafonyを用いたチャットアプリケーションです。

## 使用方法
1. Leafonyを組み立てます。必要なリーフは上から、
   - [AZ01 USB](https://docs.leafony.com/docs/leaf/others/az01/)
   - [AP01 AVR MCU](https://docs.leafony.com/docs/leaf/processor/ap01/)
   - [AC02 BLE Sugar](https://docs.leafony.com/docs/leaf/communication/ac02/)

   です。
2. Leafonyに[leafony.ino](leafony/leafony.ino)を書き込みます。
   - BLEライブラリの[TBGLib](https://github.com/Leafony/TBGLib)が必要です。
3. シリアルモニターをボーレート115200bpsで開始します。
4. WebアプリからLeafonyとBluetoothで接続します。
5. 片方からメッセージを送信するとBluetoothを経由してもう片方にメッセージが送信されます。
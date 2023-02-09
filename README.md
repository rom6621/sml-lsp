# SML-LSP
Standard MLのLanguage Server

## 必要ソフトウェア

## インストール・実行方法
0. 各種インストール（インストール済みであれば省略可）
```console
$ sudo apt install build-essential git nodejs bison flex
```
1. リポジトリをクローン
```console
$ git clone git@github.com:rom6621/sml-lsp.git
```
2. ダウンロードしたディレクトリに移動し、ビルドを行う
```console
$ cd ./server/src/parser
$ make
```
3. VS Codeでダウンロードしたディレクトリを開く
4. F5キーを押してデバッグモードを実行
5. 拡張子が`.sml`の適当なファイルを開く

### 構文解析結果の確認方法
1. VS Code ツールバーの「ターミナル」→「新しいターミナル」によりターミナルを開く
2. 表示されたターミナルのタブを「出力」に切り替え
3. 右上の「タスク」となっているプルダウンメニューを「Language Server Example」に切り替え
4. `.sml`形式のファイルを開いている時に限り、ファイルの編集が行われる度に構文解析の結果が表示されます

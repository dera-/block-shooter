"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

var bulletLimit = 40;
var rectSize = 32;
var rectInterval = 3;
var rectCount = Math.floor(g.game.height / (rectSize + rectInterval));
var rectSpeed = 3;
var filledRects = [];
function main(param) {
	var scene = new g.Scene({
		game: g.game,
		// このシーンで利用するアセットのIDを列挙し、シーンに通知します
		assetIds: ["player", "shot", "se"]
	});
	var time = 20; // 制限時間
	if (param.sessionParameter.totalTimeLimit) {
		time = param.sessionParameter.totalTimeLimit; // セッションパラメータで制限時間が指定されたらその値を使用します
	}
	var random = param.random; // 乱数生成器
	var currentBulletCount = bulletLimit;
	// 市場コンテンツのランキングモードでは、g.game.vars.gameState.score の値をスコアとして扱います
	// プレイ閾値も追加しています
	g.game.vars.gameState = { score: 0, playThreshold: 1 };
	scene.loaded.handle(function () {
		// ここからゲーム内容を記述します
		// プレイヤーを生成します
		var player = new g.Sprite({
			scene: scene,
			src: scene.assets["player"],
			width: scene.assets["player"].width,
			height: scene.assets["player"].height
		});
		// プレイヤーの初期座標を、画面の中心に設定します
		player.x = (g.game.width - player.width) / 2;
		player.y = (g.game.height - player.height) / 2;
		player.update.handle(function () {
			// 毎フレームでY座標を再計算し、プレイヤーの飛んでいる動きを表現します
			// ここではMath.sinを利用して、時間経過によって増加するg.game.ageと組み合わせて
			player.y = (g.game.height - player.height) / 2 + Math.sin(g.game.age % (g.game.fps * 10) / 4) * 10;
			// プレイヤーの座標に変更があった場合、 modified() を実行して変更をゲームに通知します
			player.modified();
		});
		scene.append(player);
		// フォントの生成
		var font = new g.DynamicFont({
			game: g.game,
			fontFamily: g.FontFamily.Serif,
			size: 48
		});
		// スコア表示用のラベル
		var scoreLabel = new g.Label({
			scene: scene,
			text: "SCORE: 0",
			font: font,
			fontSize: font.size / 2,
			textColor: "black"
		});
		scene.append(scoreLabel);
		// 残り球数表示用のラベル
		var bulletLabel = new g.Label({
			scene: scene,
			text: "BULLET: " + bulletLimit,
			font: font,
			fontSize: font.size / 2,
			textColor: "black",
			y: 0.1 * g.game.height
		});
		scene.append(bulletLabel);
		// 残り時間表示用ラベル
		var timeLabel = new g.Label({
			scene: scene,
			text: "TIME: 0",
			font: font,
			fontSize: font.size / 2,
			textColor: "black",
			x: 0.55 * g.game.width
		});
		scene.append(timeLabel);
		// タイルの登録
		for (var i = 0; i < rectCount; i++) {
			filledRects[i] = new g.FilledRect({
				scene: scene,
				cssColor: "blue", //random.get(0, 1) === 0 ? "red" : "blue",
				width: rectSize,
				height: rectSize,
				x: g.game.width - rectSize,
				y: i * (rectSize + rectInterval)
			});
			scene.append(filledRects[i]);
		}
		// 画面をタッチしたとき、SEを鳴らしながら弾を飛ばします。
		scene.pointDownCapture.handle(function () {
			// 弾が切れたら弾の生成処理を止める
			if (currentBulletCount <= 0) {
				return;
			}
			currentBulletCount--;
			bulletLabel.text = "BULLET: " + currentBulletCount;
			bulletLabel.invalidate();

			scene.assets["se"].play();
			// プレイヤーが発射する弾を生成します
			var shot = new g.Sprite({
				scene: scene,
				src: scene.assets["shot"],
				width: scene.assets["shot"].width,
				height: scene.assets["shot"].height
			});
			// 弾の初期座標を、プレイヤーの少し右に設定します
			shot.x = player.x + player.width;
			shot.y = player.y;
			shot.update.handle(function () {
				// 毎フレームで座標を確認し、画面外に出ていたら弾をシーンから取り除きます
				if (shot.x > g.game.width)
					shot.destroy();
				// 弾を右に動かし、弾の動きを表現します
				shot.x += 10;
				// 変更をゲームに通知します
				shot.modified();
				// 制限時間を過ぎていたら衝突範囲を行わずに処理を終了する
				if (time <= 0) {
					return;
				}
				// タイルとの衝突判定
				filledRects.forEach(function(rect) {
					if (
						rect.cssColor !== "white"
						&& g.Collision.intersect(shot.x, shot.y, shot.width, shot.height, rect.x, rect.y, rect.width, rect.height)
					) {
						var beforeColor = rect.cssColor;
						g.game.vars.gameState.score += rect.cssColor === "blue" ? 1 : 0;
						rect.cssColor = "white";
						rect.modified();
						scene.setTimeout(function(){
							rect.cssColor = beforeColor;
							rect.modified();
						}, 1000);
						scoreLabel.text = "SCORE: " + g.game.vars.gameState.score;
						scoreLabel.invalidate();
					}
				});
			});
			scene.append(shot);
		});
		scene.update.handle(function () {
			if (time <= 0) {
				// RPGアツマール環境であればランキングを表示します
				if (param.isAtsumaru) {
					var boardId_1 = 1;
					window.RPGAtsumaru.experimental.scoreboards.setRecord(boardId_1, g.game.vars.gameState.score).then(function () {
						window.RPGAtsumaru.experimental.scoreboards.display(boardId_1);
					});
				}
				g.game.terminateGame();
				return true; // trueを返すことでハンドラの登録が解除されます
			}
			// カウントダウン処理
			time -= 1 / g.game.fps;
			timeLabel.text = "TIME: " + Math.ceil(time);
			timeLabel.invalidate();
			// タイルの移動処理
			for (var i = 0; i < filledRects.length; i++) {
				filledRects[i].y = (filledRects[i].y + rectSpeed) % g.game.height;
				filledRects[i].modified();
			}
		});
		// ここまでゲーム内容を記述します
	});
	g.game.pushScene(scene);
}
exports.main = main;

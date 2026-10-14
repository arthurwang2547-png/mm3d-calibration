const CUES=[
  [
    {
      "text": "先量振鏡基準到材料的距離，再填入焦距高度。",
      "view": "3d",
      "model": "focus",
      "image": "05",
      "box": [
        191,
        527,
        59,
        23
      ],
      "label": "輸入實測焦距高度",
      "audio": "voice-08-01.mp3",
      "size": [
        1002,
        676
      ],
      "duration": 4.776
    }
  ],
  [
    {
      "text": "看這條亮起的尺寸線。從振鏡下方的量測基準，到材料表面的實際距離，就是焦距高度，單位是 mm。",
      "view": "side",
      "model": "focal",
      "focus": 0.9,
      "audio": "voice-07-01.mp3",
      "duration": 9.816
    },
    {
      "text": "材料高度先固定。量好這段距離並輸入，再微調第三軸，也就是聚焦軸，直到材料上的試刻圖形落焦。落焦時的基準像素，就是中立位置。",
      "view": "side",
      "model": "neutral",
      "focus": 0,
      "audio": "voice-07-02.mp3",
      "duration": 13.608
    }
  ],
  [
    {
      "text": "按預覽，先確認圖形會落在哪裡。",
      "view": "3d",
      "model": "focus",
      "image": "05",
      "box": [
        861,
        178,
        110,
        45
      ],
      "label": "先預覽位置",
      "audio": "voice-08-02.mp3",
      "size": [
        1002,
        676
      ],
      "duration": 3.816
    },
    {
      "text": "按連續 Marking，讓圖形反覆打在材料上。接著用滑鼠滾輪微調聚焦軸，觀察 Marking 效果的變化。",
      "view": "3d",
      "model": "focus",
      "image": "05",
      "box": [
        861,
        135,
        110,
        45
      ],
      "label": "開始連續試刻",
      "audio": "voice-08-03.mp3",
      "size": [
        1002,
        676
      ],
      "duration": 9.312
    },
    {
      "text": "把滑鼠移到中立位置的像素欄位，用滾輪慢慢微調。左邊的數值、滑桿和聚焦鏡片會一起移動；右邊的試刻痕跡會從很弱，慢慢變亮。方形大小要方便目視判斷，微調單位決定每格滾輪改變多少像素，填充間距則控制試刻線條的疏密。這些數值都要依材料調整。",
      "view": "3d",
      "model": "focus",
      "action": "wheel",
      "image": "05",
      "box": [
        73,
        573,
        310,
        24
      ],
      "label": "在實際 Z 欄位滾輪微調",
      "audio": "voice-08-04.mp3",
      "size": [
        1002,
        676
      ],
      "duration": 23.353
    },
    {
      "text": "看右下角的實際材料示意。聚焦軸微調時，黑色紙或金屬片上的試刻痕跡，會從很弱，慢慢變亮。能量最亮的位置，就是目前的最佳焦點。",
      "model": "marking",
      "view": "3d",
      "label": "觀察黑紙或金屬片上的試刻效果",
      "audio": "voice-08-05.mp3",
      "duration": 12.382
    },
    {
      "text": "找到焦點後，再按一次連續 Marking 停止。確認停止，才進下一步。",
      "view": "3d",
      "model": "focus",
      "image": "05",
      "box": [
        861,
        135,
        110,
        45
      ],
      "label": "停止連續試刻",
      "audio": "voice-08-06.mp3",
      "size": [
        1002,
        676
      ],
      "duration": 7.128
    },
    {
      "text": "中心落焦完成後，選取最外圈的四個參考點。預覽位置，再連續試刻，微調 Z 像素，讓四個點都達到最佳落焦。完成後，就能輸出十字中心線，確認 X、Y 的可用範圍。",
      "label": "完成最外圈四點落焦 → 輸出十字中心線",
      "page": 15,
      "kind": "corners",
      "flow": true,
      "duration": 12,
      "view": "2d",
      "model": "focus",
      "audio": ""
    }
  ],
  [
    {
      "text": "完成全台面的聚焦軸校正後，按「全幅面輸出」。這次要量的是穿過中心的 X 軸和 Y 軸中心線長度。",
      "label": "按「全幅面輸出」，量兩條中心線",
      "page": 18,
      "kind": "output",
      "flow": true,
      "duration": 12,
      "view": "2d",
      "model": "focus",
      "audio": ""
    },
    {
      "text": "例如目標範圍是 100 × 100 mm。量到 X 軸中心線是 98 mm，Y 軸中心線是 104 mm。X 還不到 100，表示範圍不足，現在還不能進入 2D 尺寸校正。",
      "label": "X＝98 不足；Y＝104 足夠",
      "page": 18,
      "kind": "measure",
      "flow": true,
      "duration": 12,
      "view": "2d",
      "model": "focus",
      "audio": ""
    },
    {
      "text": "範圍不足時，先按「返回」，退出聚焦軸校正。回到校正頁，再按「重置校正檔」。",
      "label": "返回 → 退出聚焦軸校正 → 重置校正檔",
      "page": 19,
      "kind": "reset",
      "flow": true,
      "duration": 12,
      "view": "2d",
      "model": "focus",
      "audio": ""
    },
    {
      "text": "重置校正檔之後，才能重新選擇 K 值。把 K 從 0.9375 調大，例如改成 1。接著重新完成聚焦軸校正，包括中心和最外圈四個參考點。",
      "label": "重置後調大 K，再重做聚焦軸校正",
      "page": 19,
      "kind": "redo",
      "flow": true,
      "duration": 12,
      "view": "2d",
      "model": "focus",
      "audio": ""
    },
    {
      "text": "重新完成聚焦軸校正後，再按「全幅面輸出」，量 X 和 Y 中心線。反覆確認，直到兩條中心線都大於目標範圍，才繼續。這個例子兩個方向都量到 104 mm，就可以進入尺寸校正。",
      "label": "重新輸出與量測：X、Y 都要大於目標",
      "page": 18,
      "kind": "pass",
      "flow": true,
      "duration": 12,
      "view": "2d",
      "model": "focus",
      "audio": ""
    },
    {
      "text": "如果 K 已經是 1，中心線仍不夠長，就代表這個加工平面的可用範圍不足。需要縮小目標範圍，再重新校正及確認。範圍足夠後，才用格點法或比例法完成 Z0 的 2D 尺寸校正。",
      "label": "範圍足夠，才進入格點法或比例法",
      "page": 19,
      "kind": "finish",
      "flow": true,
      "duration": 12,
      "view": "2d",
      "model": "focus",
      "audio": ""
    }
  ],
  [
    {
      "text": "確認物理幅面足夠後，選擇格點法或比例法，開始做 Z0 這一層的尺寸校正。這個範例使用格點法。",
      "view": "2d",
      "model": "field",
      "image": "05",
      "box": [
        55,
        460,
        235,
        120
      ],
      "label": "選擇格點法或比例法",
      "audio": "voice-27-01.mp3",
      "size": [
        1002,
        676
      ],
      "duration": 9.48
    },
    {
      "text": "先從 3 乘 3 開始試刻，量出實際尺寸，再把校正值填回軟體。需要更精細時，再增加格點數量。",
      "view": "2d",
      "model": "field",
      "image": "05",
      "box": [
        55,
        460,
        235,
        120
      ],
      "label": "試刻、量測、回填",
      "audio": "voice-27-02.mp3",
      "size": [
        1002,
        676
      ],
      "duration": 10.032
    },
    {
      "text": "重新試刻，確認 Z0 的 X 和 Y 尺寸都正確，Z0 這一層才算完成。接著進入 3D 多層校正。",
      "view": "3d",
      "model": "focus",
      "image": "05",
      "box": [
        820,
        585,
        155,
        50
      ],
      "label": "完成 Z0 → 進入 3D 校正",
      "audio": "voice-27-03.mp3",
      "size": [
        1002,
        676
      ],
      "duration": 8.472
    }
  ]
];

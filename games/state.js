const ALPHABET_LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ALPHABET_LEVELS=new Set(['easy','normal','hard','extra','legend']);
const ALPHABET_SCATTER_CONFIG=Object.freeze({
  hard:{minX:6,maxX:94,minY:18,maxY:82,xScale:6.5,yScale:14},
  extra:{minX:6,maxX:94,minY:13,maxY:87,xScale:7.5,yScale:10},
});
const ALPHABET_MOTION_CONFIG=Object.freeze({
  legend:{sizes:[30,38,46,54],speedMin:30,speedMax:52,area:{left:0,top:0,width:1,height:1}},
});
let alphabetLevel='easy';
let alphabetSoundEnabled=true;
let alphabetPhase='setup';
let alphabetExpectedIndex=0;
let alphabetTimerFrame=0;
let alphabetStartedAt=0;
let alphabetElapsed=0;
let alphabetSharedMode=false;
let alphabetReturnPage='lt1unit';
let alphabetAudioContext=null;
let alphabetLastOrder=[];
let alphabetMotionFrame=0;
let alphabetMotionLastTime=0;
let alphabetMovingItems=[];
const ROULETTE_STORAGE_KEY='dekiru-created-games-v1';
const ROULETTE_PLAYERS=[
  {id:1,color:'#fd6666',shape:'●',shapeKey:'circle',pieceAsset:'../assets/ui/roulette-piece-player-1.svg?v=0.0.46',buttonAsset:'../assets/ui/roulette-button-player-1.svg?v=0.0.46',cornerBoardAsset:'../assets/ui/roulette_corner_board_player-1.svg?v=0.0.46',cornerBoardDisabledAsset:'../assets/ui/roulette_corner_board_player-1-disabled.svg?v=0.0.46'},
  {id:2,color:'#8bb7e8',shape:'▲',shapeKey:'triangle',pieceAsset:'../assets/ui/roulette-piece-player-2.svg?v=0.0.46',buttonAsset:'../assets/ui/roulette-button-player-2.svg?v=0.0.46',cornerBoardAsset:'../assets/ui/roulette_corner_board_player-2.svg?v=0.0.46',cornerBoardDisabledAsset:'../assets/ui/roulette_corner_board_player-2-disabled.svg?v=0.0.46'},
  {id:3,color:'#fccc8e',shape:'■',shapeKey:'square',pieceAsset:'../assets/ui/roulette-piece-player-3.svg?v=0.0.46',buttonAsset:'../assets/ui/roulette-button-player-3.svg?v=0.0.46',cornerBoardAsset:'../assets/ui/roulette_corner_board_player-3.svg?v=0.0.46',cornerBoardDisabledAsset:'../assets/ui/roulette_corner_board_player-3-disabled.svg?v=0.0.46'},
  {id:4,color:'#a8d08d',shape:'★',shapeKey:'star',pieceAsset:'../assets/ui/roulette-piece-player-4.svg?v=0.0.46',buttonAsset:'../assets/ui/roulette-button-player-4.svg?v=0.0.46',cornerBoardAsset:'../assets/ui/roulette_corner_board_player-4.svg?v=0.0.46',cornerBoardDisabledAsset:'../assets/ui/roulette_corner_board_player-4-disabled.svg?v=0.0.46'},
];
const ROULETTE_CORNERS=[
  {id:'top-left',label:'左上',rotation:135},
  {id:'top-right',label:'右上',rotation:225},
  {id:'bottom-right',label:'右下',rotation:315},
  {id:'bottom-left',label:'左下',rotation:45},
];
let createdGames=[];
let editingGameId='';
let creatorSelectedCardIds=new Set();
let activeRouletteConfig=null;
let rouletteReturnPage='createGames';
let rouletteSharedMode=false;
let currentRouletteShareUrl='';
let roulettePlayerCount=0;
let roulettePlaced=new Map();
let roulettePlacementSelection=0;
let roulettePlayers=[];
let rouletteCourse=[];
let rouletteSelectedPlayer=0;
let roulettePhrasePlayerId=0;
let rouletteSelectedPhraseText='';
let roulettePhraseWord='～';
let roulettePhraseCardId='';
let rouletteSpinRotation=0;
let rouletteSpinning=false;
let rouletteSpinTimer=0;
let roulettePendingPlayer=0;
let rouletteStarted=false;
let rouletteRunId=0;

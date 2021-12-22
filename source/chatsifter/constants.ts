/*
	Copyright Myles Trevino
	Licensed under the Apache License, Version 2.0
	http://www.apache.org/licenses/LICENSE-2.0
*/


export const version = '1.3.4';
export const maximumInitializationAttempts = 10;
export const maximumChatMessages = 256;
export const scrollDelay = 0.16;
export const autoscrollMargin = 100;
export const maximumAuthorNameLength = 18;
export const updateDelay = 0;

export const deepLApiUrl = 'https://api-free.deepl.com/v2/translate';
export const deepLProUrl = 'https://www.deepl.com/pro';
export const laventhUrl = 'https://laventh.com';
export const githubUrl = 'https://github.com/Myles-Trevino/Chatsifter';
export const youtubeVideoUrlQuery = 'youtube.com/watch?v=';
export const boundTabIdQueryParamKey = 'boundTabId';
export const boundTabTitleQueryParamKey = 'boundTabTitle';
export const defaultTabTitle = 'None';

export const chatFrameTag = 'ytd-live-chat-frame';
export const defaultChatMessageTag = 'yt-live-chat-text-message-renderer';
export const membershipMessageTag = 'yt-live-chat-membership-item-renderer';
export const superchatMessageTag = 'yt-live-chat-paid-message-renderer';
export const superchatStickerMessageTag = 'yt-live-chat-paid-sticker-renderer';
export const badgeTag = 'yt-live-chat-author-badge-renderer';

export const contentPortName = 'Content Script Port';
export const extensionPortNameBase = 'Extension Port ';

export const savedStateKey = 'savedState';


export const japaneseCharacters = new Set
([
	// Hiragana.
	'ぁ', 'あ', 'ぃ', 'い', 'ぅ', 'う', 'ぇ', 'え', 'ぉ', 'お', 'か', 'が', 'き', 'ぎ', 'く', 'ぐ', 'け', 'げ', 'こ', 'ご', 'さ', 'ざ', 'し', 'じ', 'す', 'ず', 'せ', 'ぜ', 'そ', 'ぞ', 'た', 'だ', 'ち', 'ぢ', 'っ', 'つ', 'づ', 'て', 'で', 'と', 'ど', 'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ば', 'ぱ', 'ひ', 'び', 'ぴ', 'ふ', 'ぶ', 'ぷ', 'へ', 'べ', 'ぺ', 'ほ', 'ぼ', 'ぽ', 'ま', 'み', 'む', 'め', 'も', 'ゃ', 'や', 'ゅ', 'ゆ', 'ょ', 'よ', 'ら', 'り', 'る', 'れ', 'ろ', 'ゎ', 'わ', 'ゐ', 'ゑ', 'を', 'ん', 'ゔ', 'ゕ', 'ゖ', '゛', '゜', 'ゝ', 'ゞ', 'ゟ',

	// Katakana.
	'゠', 'ァ', 'ア', 'ィ', 'イ', 'ゥ', 'ウ', 'ェ', 'エ', 'ォ', 'オ', 'カ', 'ガ', 'キ', 'ギ', 'ク', 'グ', 'ケ', 'ゲ', 'コ', 'ゴ', 'サ', 'ザ', 'シ', 'ジ', 'ス', 'ズ', 'セ', 'ゼ', 'ソ', 'ゾ', 'タ', 'ダ', 'チ', 'ヂ', 'ッ', 'ツ', 'ヅ', 'テ', 'デ', 'ト', 'ド', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ', 'ハ', 'バ', 'パ', 'ヒ', 'ビ', 'ピ', 'フ', 'ブ', 'プ', 'ヘ', 'ベ', 'ペ', 'ホ', 'ボ', 'ポ', 'マ', 'ミ', 'ム', 'メ', 'モ', 'ャ', 'ヤ', 'ュ', 'ユ', 'ョ', 'ヨ', 'ラ', 'リ', 'ル', 'レ', 'ロ', 'ヮ', 'ワ', 'ヰ', 'ヱ', 'ヲ', 'ン', 'ヴ', 'ヵ', 'ヶ', 'ヷ', 'ヸ', 'ヹ', 'ヺ', '・', 'ー', 'ヽ', 'ヾ', 'ヿ',

	// Popular Kanji.
	'日', '一', '国', '会', '人', '年', '大', '十', '二', '本', '中', '長', '出', '三', '同', '時', '政', '事', '自', '行', '社', '見', '月', '分', '議', '後', '前', '民', '生', '連', '五', '発', '間', '対', '上', '部', '東', '者', '党', '地', '合', '市', '業', '内', '相', '方', '四', '定', '今', '回', '新', '場', '金', '員', '九', '入', '選', '立', '開', '手', '米', '力', '学', '問', '高', '代', '明', '実', '円', '関', '決', '子', '動', '京', '全', '目', '表', '戦', '経', '通', '外', '最', '言', '氏', '現', '理', '調', '体', '化', '田', '当', '八', '六', '約', '主', '題', '下', '首', '意', '法', '不', '来', '作', '性', '的', '要', '用', '制', '治', '度', '務', '強', '気', '小', '七', '成', '期', '公', '持', '野', '協', '取', '都', '和', '統', '以', '機', '平', '総', '加', '山', '思', '家', '話', '世', '受', '区', '領', '多', '県', '続', '進', '正', '安', '設', '保', '改', '数', '記', '院', '女', '初', '北', '午', '指', '権', '心', '界', '支', '第', '産', '結', '百', '派', '点', '教', '報', '済', '書', '府', '活', '原', '先', '共', '得', '解', '名', '交', '資', '予', '川', '向', '際', '査', '勝', '面', '委', '告', '軍', '文', '反', '元', '重', '近', '千', '考', '判', '認', '画', '海', '参', '売', '利', '組', '知', '案', '道', '信', '策', '集', '在', '件', '団', '別', '物', '側', '任', '引', '使', '求', '所', '次', '水', '半', '品', '昨', '論', '計', '死', '官', '増', '係', '感', '特', '情', '投', '示', '変', '打', '男', '基', '私', '各', '始', '島', '直', '両', '朝', '革', '価', '式', '確', '村', '提', '運', '終', '挙', '果', '西', '勢', '減', '台', '広', '容', '必', '応', '演', '電', '歳', '住', '争', '談', '能', '無', '再', '位', '置', '企', '真', '流', '格', '有', '疑', '口', '過', '局', '少', '放', '税', '検', '藤', '町', '常', '校', '料', '沢', '裁', '状', '工', '建', '語', '球', '営', '空', '職', '証', '土', '与', '急', '止', '送', '援', '供', '可', '役', '構', '木', '割', '聞', '身', '費', '付', '施', '切', '由', '説', '転', '食', '比', '難', '防', '補', '車', '優', '夫', '研', '収', '断', '井', '何', '南', '石', '足', '違', '消', '境', '神', '番', '規', '術', '護', '展', '態', '導', '鮮', '備', '宅', '害', '配', '副', '算', '視', '条', '幹', '独', '警', '宮', '究', '育', '席', '輸', '訪', '楽', '起', '万', '着', '乗', '店', '述', '残', '想', '線', '率', '病', '農', '州', '武', '声', '質', '念', '待', '試', '族', '象', '銀', '域', '助', '労', '例', '衛', '然', '早', '張', '映', '限', '親', '額', '監', '環', '験', '追', '審', '商', '葉', '義', '伝', '働', '形', '景', '落', '欧', '担', '好', '退', '準', '賞', '訴', '辺', '造', '英', '被', '株', '頭', '技', '低', '毎', '医', '復', '仕', '去', '姿', '味', '負', '閣', '韓', '渡', '失', '移', '差', '衆', '個', '門', '写', '評', '課', '末', '守', '若', '脳', '極', '種', '美', '岡', '影', '命', '含', '福', '蔵', '量', '望', '松', '非', '撃', '佐', '核', '観', '察', '整', '段', '横', '融', '型', '白', '深', '字', '答', '夜', '製', '票', '況', '音', '申', '様', '財', '港', '識', '注', '呼', '渉', '達'
]);

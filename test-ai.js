// 本地解析逻辑冒烟测试（无需 Electron 环境）
const { localParse } = require('./lib/ai.js');

const NOTICE = `@所有人 ′本学期形势与政策课的学习内容已在学习通发布，请各位同学及时完成线上学习的各个任务点，同时在截止时间之前完成在线考试。考试时间是10月12日-10月18日晚上11点（截止），每位同学允许重考2次，以最高分为考试成绩。线上学习占总成绩百分之二十、考试成绩占总成绩百分之八十。请同学们务必按照时间节点完成学习和考试，否则影响毕业。`;

const items = localParse(NOTICE);

console.log('===== 解析结果 =====');
console.log(JSON.stringify(items, null, 2));

let pass = true;
// 断言 1：至少识别出任务
if (!items.length) { console.error('FAIL: 没有解析出任务'); pass = false; }
// 断言 2：截止时间应提取为 2026-10-18 23:00
const deadline = items[0] && items[0].deadline;
if (deadline !== '2026-10-18 23:00') { console.error(`FAIL: 截止时间应为 2026-10-18 23:00，实际 ${deadline}`); pass = false; }
// 断言 3：涉及考试/毕业的任务应标星
if (!items.some(i => i.isStar)) { console.error('FAIL: 应有星标任务'); pass = false; }
// 断言 4：备注应包含占比/重考等补充信息
if (!items.some(i => (i.remark || '').includes('重考') || (i.remark || '').includes('成绩'))) { console.error('FAIL: 备注应包含分数规则'); pass = false; }

console.log(pass ? '\n===== 全部通过 ✓ =====' : '\n===== 有失败项 ✗ =====');
process.exit(pass ? 0 : 1);

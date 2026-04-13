# BATI

**B · A · T · I — Blue Archive Type Indicator**

一个以蔚蓝档案角色为主题的 MBTI 风格同人测试站。

回答 39 道题目后，页面会给出：

- 1 位命中的蔚蓝档案角色
- 1 个对应叙事原型
- 4 维 MBTI 倾向比例

## 项目特点

- 39 道题
- 8 个原型
- 16 位蔚蓝档案学生
- 纯前端静态站点
- 结果只保存在本地浏览器，无需后端

## 当前角色

- 空崎日奈
- 枣伊吕波
- 天雨亚子
- 陆八魔阿露
- 鬼方佳代子
- 天童爱丽丝
- 圣园未花
- 浅黄睦月
- 早濑优香
- 阿慈谷日富美
- 银镜伊织
- 下江小春
- 砂狼白子
- 小鸟游星野
- 美甘宁瑠
- 十六夜野乃美

## 本地开发

```bash
npm install
npm run dev
```

## 生产构建

```bash
npm run build
```

构建产物输出到 `dist/`，可以直接部署到 GitHub Pages 等静态托管平台。

## GitHub Pages

仓库已包含 GitHub Pages 自动部署工作流：

- 推送到 `main` 分支后会自动构建并发布
- 在 GitHub 仓库的 `Settings -> Pages` 中把 `Source` 设为 `GitHub Actions` 即可

## 图像生成

仓库内置了 Blue Archive 参考图抓取和 Gemini 出图脚本：

```bash
node scripts/fetch_ba_wiki_refs.mjs hina aru
node scripts/fetch_16p_style_refs.mjs INTJ ENTP
HTTP_PROXY=http://127.0.0.1:7890 HTTPS_PROXY=http://127.0.0.1:7890 GEMINI_API_KEY=你的密钥 node scripts/generate_gemini_mbti_images.mjs hina aru
```

- `fetch_ba_wiki_refs.mjs` 会抓取 Blue Archive 角色参考图
- `fetch_16p_style_refs.mjs` 会抓取 16Personalities 官方风格参考图
- `generate_gemini_mbti_images.mjs` 会结合风格参考和角色参考，用 Gemini 生成结果图并写回 `src/data/characterVisuals.json`
- 脚本默认支持本地代理 `http://127.0.0.1:7890`

## 致谢与来源

这个项目是一个独立维护的二次创作版本，灵感与早期页面结构参考自开源项目 [ACGTI](https://github.com/tianxingleo/ACGTI)。

当前仓库不再跟踪上游，也不是原项目的 fork；题库、角色库、结果文案、视觉素材和图像生成流程都已经按蔚蓝档案主题进行了独立改造。

## 说明

- 这是同人娱乐测试，不是人格诊断
- `Blue Archive / 蔚蓝档案` 相关角色与设定版权归原作方所有
- 本仓库仅用于非商业同人展示与技术学习

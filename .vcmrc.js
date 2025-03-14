module.exports = {
  types: [
    "feat", // 新功能（feature）
    "fix", // 修补bug
    "docs", // 文档（documentation）
    "style", // 格式（不影响代码运行的变动）
    "refactor", // 重构（即不是新增功能，也不是修改bug的代码变动）
    "perf", // 优化相关，比如提升性能、体验
    "test", // 增加测试
    "build", // 编译相关修改，例如发布版本、对项目构建或依赖的改动
    "ci", // 持续集成修改
    "chore", // 构建过程或辅助工具的变动
    "revert", // 代码回滚
  ],
  warnOnFail: false,
  maxSubjectLength: 100,
  subjectPattern: ".+",
  subjectPatternErrorMsg: "请输入message信息!",
  helpMessage:
    "Commit message 格式错误， http://www.ruanyifeng.com/blog/2016/01/commit_message_change_log.html",
};

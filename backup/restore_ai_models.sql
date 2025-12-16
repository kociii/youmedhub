-- AI 模型配置恢复脚本
-- 生成时间: 2025-12-16 13:01:58

DELETE FROM ai_models;  -- 清空现有配置

INSERT INTO ai_models (
    model_id, name, provider, api_key, base_url, prompt,
    thinking_params, use_official_sdk, is_active
) VALUES (
    'qwen3-vl-flash',
    'Qwen3-VL-Flash',
    'aliyun',
    'sk-ed1cf899f8e949a78e0b4195d9f402ba',
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
    '请分析这个视频，生成详细的分镜脚本，包括镜号、时间段、画面描述、台词、景别和运镜技巧。',
    '',
    true,
    true
);

INSERT INTO ai_models (
    model_id, name, provider, api_key, base_url, prompt,
    thinking_params, use_official_sdk, is_active
) VALUES (
    'glm-4v-plus',
    'glm-4.6v',
    '智谱',
    '5af04f2db8324883994e49e29697981c.tbtrKoVUOeFwdti6',
    'https://open.bigmodel.cn/api/paas/v4',
    '请分析这个视频，生成详细的分镜脚本，包括镜号、时间段、画面描述、台词、景别和运镜技巧。',
    '',
    true,
    false
);

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const workflowPath = path.resolve("n8n/workflows/video-gen/fk_video_gen_bot_flow/fk_video_gen_bot_flow.json");
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));

function getNode(name) {
  const node = workflow.nodes.find(n => n.name === name);
  if (!node) throw new Error("Node not found: " + name);
  return node;
}

function evaluateExpression(exprStr, ctx) {
  if (typeof exprStr !== "string" || !exprStr.startsWith("={{") || !exprStr.endsWith("}}")) {
    return exprStr;
  }
  const code = exprStr.slice(3, -2).trim();
  const fn = new Function("$", "$json", `return (${code});`);
  return fn(ctx.$, ctx.$json);
}

function runCodeNode(nodeName, { telegramUpdate, staticData = {}, priorNodes = {}, mockHttp }) {
  const node = getNode(nodeName);
  const code = node.parameters.jsCode;
  const defaultUserConfig = {
    bot_name: "fk_video_gen_bot",
    telegram_bot_token: "TEST_TELEGRAM_BOT_TOKEN",
    openrouter_model: "google/gemini-2.5-flash",
    telegraph_access_token: "TEST_TELEGRAPH_ACCESS_TOKEN",
    runpod_image_endpoint_url: "https://api.runpod.ai/v2/8ezgyyjq87n2h4/runsync",
    runpod_video_endpoint_url: "https://api.runpod.ai/v2/dwtma7j6xegnfz/runsync"
  };
  const nodeMap = {
    Telegram_Trigger: { first: () => ({ json: telegramUpdate || {} }) },
    User_Config: { first: () => ({ json: defaultUserConfig }) },
    Dispatcher_And_State: {
      first: () => ({
        json: {
          chat_id: "6386729762",
          telegram_bot_token: defaultUserConfig.telegram_bot_token,
          openrouter_model: defaultUserConfig.openrouter_model,
          telegraph_access_token: defaultUserConfig.telegraph_access_token,
          runpod_image_endpoint_url: defaultUserConfig.runpod_image_endpoint_url,
          runpod_video_endpoint_url: defaultUserConfig.runpod_video_endpoint_url,
          session: staticData.sessions ? (staticData.sessions["6386729762"] || {}) : {}
        }
      })
    },
    ...priorNodes
  };
  const $ = (name) => nodeMap[name] || { first: () => ({ json: {} }) };
  const $getWorkflowStaticData = () => staticData;
  const $json = telegramUpdate || {};
  const $http = mockHttp || {
    request: async () => ({ data: { ok: true, result: { url: "https://telegra.ph/Mock-Page-01" } } })
  };
  const mockFetch = async (url, opts = {}) => {
    const res = await $http.request({ url, ...opts });
    const payload = res?.data ?? res;
    return { ok: true, json: async () => payload };
  };
  const ctx = { helpers: { httpRequest: (opts) => $http.request(opts) } };
  if (code.includes("await ")) {
    const fn = new Function("$", "$json", "$getWorkflowStaticData", "$http", "fetch", `return (async () => { ${code} })()`);
    return fn.call(ctx, $, $json, $getWorkflowStaticData, $http, mockFetch);
  }
  const fn = new Function("$", "$json", "$getWorkflowStaticData", "$http", "fetch", code);
  return fn.call(ctx, $, $json, $getWorkflowStaticData, $http, mockFetch);
}

describe("Fluid Motion Pipeline — End-to-End Simulation & Hardening", () => {

  test("Architecture: Progress nodes are parallel and decoupled from inference", () => {
    const reConns = workflow.connections.Route_Event.main;
    // Output 2: Gen_World_And_Storyboard
    const out2 = reConns[2];
    assert.equal(out2.length, 2, "Route_Event branch 2 must have 2 parallel targets");
    const targetNames2 = out2.map(t => t.node);
    assert.ok(targetNames2.includes("Send_Storyboard_Progress"), "Must target Send_Storyboard_Progress");
    assert.ok(targetNames2.includes("Prep_Storyboard_Prompt"), "Must target Prep_Storyboard_Prompt");

    // Output 3: Gen_Image_Draft
    const out3 = reConns[3];
    assert.equal(out3.length, 2, "Route_Event branch 3 must have 2 parallel targets");
    const targetNames3 = out3.map(t => t.node);
    assert.ok(targetNames3.includes("Send_Image_Progress"), "Must target Send_Image_Progress");
    assert.ok(targetNames3.includes("Prep_RunPod_Image_Payload"), "Must target Prep_RunPod_Image_Payload");

    // Terminal leaf check: progress nodes must not have downstream targets
    assert.equal(workflow.connections.Send_Storyboard_Progress.main[0].length, 0, "Send_Storyboard_Progress must not block downstream");
    assert.equal(workflow.connections.Send_Image_Progress.main[0].length, 0, "Send_Image_Progress must not block downstream");
  });

  test("Resilience: All Telegram send nodes have error recovery flags where appropriate", () => {
    const progressSb = getNode("Send_Storyboard_Progress");
    assert.equal(progressSb.parameters.options?.response?.response?.neverError, true);

    const progressImg = getNode("Send_Image_Progress");
    assert.equal(progressImg.parameters.options?.response?.response?.neverError, true);

    const sendSb = getNode("Send_Storyboard_Telegram");
    assert.equal(sendSb.parameters.options?.response?.response?.neverError, true);
  });

  test("E2E Stage 1 to 4: Fresh user journey from Greeting -> Universe -> Style -> Storyboard", async () => {
    const staticData = { sessions: {} };
    const chatId = "6386729762";

    // Step 1: User says "/start"
    const step1 = runCodeNode("Dispatcher_And_State", {
      telegramUpdate: { message: { chat: { id: 6386729762 }, text: "/start" } },
      staticData
    })[0].json;
    assert.equal(step1.event_type, "send_welcome");
    assert.ok(step1.reply_markup.inline_keyboard.length >= 3);

    // Step 2: User clicks Diva Universe
    const step2 = runCodeNode("Dispatcher_And_State", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "type:diva" } },
      staticData
    })[0].json;
    assert.equal(step2.event_type, "send_message");
    assert.ok(step2.text.includes("DIVA"));
    assert.ok(step2.reply_markup.inline_keyboard.some(row => row.some(b => b.callback_data === "style:anime")));
    assert.equal(staticData.sessions[chatId].stage, "selecting_style");
    assert.equal(staticData.sessions[chatId].video_type, "diva");

    // Step 3: User clicks Anime Style
    const step3 = runCodeNode("Dispatcher_And_State", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "style:anime" } },
      staticData
    })[0].json;
    assert.equal(step3.event_type, "send_message");
    assert.ok(step3.text.includes("Concept"));
    assert.equal(staticData.sessions[chatId].stage, "awaiting_idea");
    assert.equal(staticData.sessions[chatId].style, "anime");

    // Step 4: User submits story concept
    const userIdea = "Sia in blue translucent dress slices Bane with katana in rain";
    const step4 = runCodeNode("Dispatcher_And_State", {
      telegramUpdate: { message: { chat: { id: 6386729762 }, text: userIdea } },
      staticData
    })[0].json;
    assert.equal(step4.event_type, "gen_world_and_storyboard");
    assert.equal(step4.session.idea, userIdea);
    assert.equal(staticData.sessions[chatId].stage, "generating_storyboard");

    // Parallel Branch 1: Progress Notification
    const progressNode = getNode("Send_Storyboard_Progress");
    const progressBody = evaluateExpression(progressNode.parameters.jsonBody, {
      $: () => ({ first: () => ({ json: step4 }) }),
      $json: step4
    });
    const parsedProgress = JSON.parse(progressBody);
    assert.equal(parsedProgress.chat_id, chatId);
    assert.equal(parsedProgress.parse_mode, "HTML");
    assert.ok(parsedProgress.text.includes("<b>Crafting Storyboard...</b>"));

    // Parallel Branch 2: Prep Storyboard Prompt
    const prepResult = runCodeNode("Prep_Storyboard_Prompt", {
      telegramUpdate: step4,
      staticData
    })[0].json;
    assert.ok(prepResult.ai_payload);
    assert.equal(prepResult.ai_payload.model, "google/gemini-2.5-flash");
    const sysPrompt = prepResult.ai_payload.messages[0].content;
    assert.ok(sysPrompt.includes("DIVA UNIVERSE CHARACTER ROSTER"));
    assert.ok(sysPrompt.includes("Sia"));
    assert.ok(sysPrompt.includes("Anime SDXL"));
    assert.ok(sysPrompt.includes("no text, no words"));

    // Step 5: OpenRouter responds with 3 sections
    const mockOpenRouterContent = `## SECTION 1 — WORLDSHEET
\`\`\`json
{
  "characters": [{"name": "Sia", "appearance": "Sharp white hair, cybernetic limbs", "wardrobe": "Blue translucent dress", "props": ["katana"]}],
  "environment": {"setting": "Tokyo alley", "time_of_day": "Midnight", "atmosphere": "Rain", "color_palette": ["#0000FF", "#FF00FF"], "key_details": ["neon signs"]},
  "style": {"rendering": "anime", "lens": "35mm", "color_grade": "vibrant", "special_fx": "rain particles"}
}
\`\`\`
## SECTION 2 — STORYBOARD
**Frame 1**
- **Action:** Sia stands in rain
- **Camera:** Low angle
- **Lighting/SFX:** Blue neon
**Frame 2**
- **Action:** Bane approaches with rose
- **Camera:** Over the shoulder
- **Lighting/SFX:** Shadows
**Frame 3**
- **Action:** Sia draws katana
- **Camera:** Close-up
- **Lighting/SFX:** Lightning flash
**Frame 4**
- **Action:** Katana slice, sparks fly
- **Camera:** Dynamic dutch tilt
- **Lighting/SFX:** Sparks
### Director Notes
High impact action sequence.
## SECTION 3 — IMAGE PROMPT
IMAGE_PROMPT: Multi-panel storyboard grid, 4-panel layout, top-left: Sia in blue translucent dress. top-right: Bane approaches. bottom-left: Katana stance. bottom-right: Katana strike with sparks. Anime style, no text, no words, no letters.`;

    const formatResult = await runCodeNode("Format_Storyboard_Response", {
      telegramUpdate: { choices: [{ message: { content: mockOpenRouterContent } }] },
      staticData,
      mockHttp: {
        request: async () => ({ ok: true, result: { url: "https://telegra.ph/Sia-Bane-Storyboard-01" } })
      }
    });

    assert.equal(formatResult.length, 1);
    const card = formatResult[0].json;
    assert.equal(card.is_error, false);
    assert.ok(card.send_text.includes("Storyboard Ready"));
    assert.ok(card.send_text.includes("https://telegra.ph/Sia-Bane-Storyboard-01"));
    assert.equal(card.reply_markup.inline_keyboard[0][0].callback_data, "action:approve_storyboard");
    assert.equal(card.reply_markup.inline_keyboard[0][1].callback_data, "action:regen_storyboard");

    // Verify session persistence
    const currentSession = staticData.sessions[chatId];
    assert.ok(currentSession.worldSheet);
    assert.ok(currentSession.storyboard);
    assert.ok(currentSession.imagePrompt.includes("Multi-panel"));
    assert.equal(currentSession.frameCount, 4);
    assert.equal(currentSession.stage, "storyboard_review");
  });

  test("E2E Stage 5 to 7: Approval -> Image Generation -> Video Hand-off", () => {
    const chatId = "6386729762";
    const staticData = {
      sessions: {
        [chatId]: {
          video_type: "diva",
          style: "anime",
          stage: "storyboard_review",
          idea: "Sia in blue translucent dress",
          imagePrompt: "Multi-panel storyboard grid, 4-panel layout, Sia with katana...",
          frameCount: 4
        }
      }
    };

    // User clicks Approve Storyboard
    const stepApprove = runCodeNode("Dispatcher_And_State", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "action:approve_storyboard" } },
      staticData
    })[0].json;
    assert.equal(stepApprove.event_type, "gen_image_draft");
    assert.equal(staticData.sessions[chatId].stage, "generating_image");

    // Prep RunPod Payload
    const prepImage = runCodeNode("Prep_RunPod_Image_Payload", {
      telegramUpdate: stepApprove,
      staticData
    })[0].json;
    assert.ok(prepImage.runpod_payload?.input?.workflow);
    const wf = prepImage.runpod_payload.input.workflow;
    assert.equal(wf["1"].inputs.ckpt_name, "animagine-xl-4.0.safetensors");
    assert.ok(wf["2"].inputs.text.includes("Multi-panel storyboard grid"));
    assert.ok(wf["3"].inputs.text.includes("watermark"));
    assert.ok(wf["3"].inputs.text.includes("text"));

    // RunPod Image Worker completes
    const mockImageData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const procImage = runCodeNode("Process_Image_Output", {
      telegramUpdate: { status: "COMPLETED", output: { images: [{ data: mockImageData }] } },
      staticData
    })[0];
    assert.equal(procImage.json.is_error, false);
    assert.ok(procImage.binary?.photo?.data);
    assert.equal(staticData.sessions[chatId].stage, "image_approved");
    assert.equal(staticData.sessions[chatId].reference_image_base64, mockImageData);

    // User clicks Generate Video
    const stepVideo = runCodeNode("Dispatcher_And_State", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "action:confirm_image" } },
      staticData
    })[0].json;
    assert.equal(stepVideo.event_type, "gen_video");
    assert.equal(staticData.sessions[chatId].stage, "generating_video");

    const dispatchVideo = runCodeNode("Dispatch_Video_Job", {
      telegramUpdate: stepVideo,
      staticData
    })[0].json;
    assert.ok(dispatchVideo.send_text.includes("Video Render Pipeline Engaged"));
    assert.equal(dispatchVideo.reply_markup.inline_keyboard[0][0].callback_data, "action:reset");
  });

  test("Cached Restoration: show_image_cached restores binary photo from session directly", () => {
    const chatId = "6386729762";
    const mockCachedImg = "CACHED_BASE64_BYTES";
    const staticData = {
      sessions: {
        [chatId]: {
          video_type: "diva",
          stage: "image_approved",
          reference_image_base64: mockCachedImg
        }
      }
    };

    // User triggers resume or action:resume
    const resumeEvent = runCodeNode("Dispatcher_And_State", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "action:resume" } },
      staticData
    })[0].json;
    assert.equal(resumeEvent.event_type, "show_image_cached");

    // Route_Event sends to Process_Image_Output
    const result = runCodeNode("Process_Image_Output", {
      telegramUpdate: resumeEvent,
      staticData
    })[0];
    assert.equal(result.json.is_error, false, "Cached image recall must NOT error");
    assert.equal(result.binary?.photo?.data, mockCachedImg, "Must restore cached photo binary");
    assert.ok(result.json.caption.includes("Reference Image Rendered"));
  });

  test("Error Boundary: OpenRouter failure triggers graceful retry prompt", async () => {
    const staticData = { sessions: { "6386729762": { video_type: "pro" } } };
    const errOutput = { error: { message: "Rate limit exceeded on OpenRouter" } };

    const res = await runCodeNode("Format_Storyboard_Response", {
      telegramUpdate: errOutput,
      staticData
    });

    assert.equal(res.length, 1);
    const out = res[0].json;
    assert.equal(out.is_error, true);
    assert.ok(out.send_text.includes("Rate limit exceeded"));
    assert.equal(out.reply_markup.inline_keyboard[0][0].callback_data, "action:regen_storyboard");
  });

  test("Error Boundary: Telegraph failure falls back safely without breaking Telegram message", async () => {
    const staticData = {
      sessions: {
        "6386729762": {
          video_type: "pro",
          style: "noir",
          idea: "Detective in foggy harbor"
        }
      }
    };
    const llmOutput = `## SECTION 1 — WORLDSHEET\n\`\`\`json\n{}\n\`\`\`\n## SECTION 2 — STORYBOARD\n**Frame 1**\n- Action: Detective lights match\n## SECTION 3 — IMAGE PROMPT\nIMAGE_PROMPT: Detective grid`;

    const res = await runCodeNode("Format_Storyboard_Response", {
      telegramUpdate: { choices: [{ message: { content: llmOutput } }] },
      staticData,
      mockHttp: {
        request: async () => { throw new Error("Telegraph 502 Bad Gateway"); }
      }
    });

    assert.equal(res.length, 1);
    const out = res[0].json;
    assert.equal(out.is_error, false);
    assert.equal(out.telegraph_url, null);
    assert.ok(out.send_text.includes("Storyboard Ready"));
    assert.ok(out.send_text.includes("Detective lights match"));
    assert.ok(out.reply_markup.inline_keyboard[0][0].callback_data, "action:approve_storyboard");
  });

});

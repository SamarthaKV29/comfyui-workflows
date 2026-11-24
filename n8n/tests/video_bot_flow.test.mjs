import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const mockHttp = {
  request: async () => ({ data: { ok: true, result: { url: "https://telegra.ph/Test-Storyboard-01", path: "Test-Storyboard-01" } } })
};

const workflowPath = path.resolve("n8n/workflows/video-gen/fk_video_gen_bot_flow/fk_video_gen_bot_flow.json");
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));

function getNode(name) {
  const node = workflow.nodes.find(n => n.name === name);
  if (!node) throw new Error("Node not found: " + name);
  return node;
}

function runCodeNode(nodeName, { telegramUpdate, staticData = {}, priorNodes = {}, customHttp = null }) {
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
  const $http = customHttp || mockHttp;
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

describe("Fluid Motion AI Video Bot Flow - Unit Tests", () => {

  test("Security & Credentials: Native credentials, no raw API keys, SceneArchitect removed", () => {
    const uc = getNode("User_Config");
    const assigns = uc.parameters?.assignments?.assignments || [];
    assert.equal(assigns.find(a => a.name === "openrouter_api_key"), undefined);
    assert.equal(assigns.find(a => a.name === "runpod_api_key"), undefined);
    assert.ok(assigns.find(a => a.name === "telegraph_access_token"), "telegraph_access_token must be in User_Config");
    assert.equal(getNode("Call_OpenRouter_Storyboard").credentials?.openRouterApi?.id, "Dkx6FORN8rA53uMB");
    assert.equal(workflow.nodes.find(n => n.name === "Call_OpenRouter_SceneArchitect"), undefined, "SceneArchitect must be removed");
    assert.equal(getNode("Call_RunPod_Image_Worker").credentials?.httpBearerAuth?.id, "RqHQQ4NPFw46X9Ul");
    assert.equal(getNode("Telegram_Trigger").credentials?.telegramApi?.id, "17HGVkKpgfbP8iA7");
  });

  test("Security & Sandbox: Zero fs/child_process imports in code nodes", () => {
    for (const n of workflow.nodes) {
      const code = n.parameters?.jsCode || "";
      assert.doesNotMatch(code, /require\s*\(\s*[']fs[']\s*\)/, n.name + " imports fs!");
      assert.doesNotMatch(code, /require\s*\(\s*[']child_process[']\s*\)/, n.name + " imports child_process!");
    }
  });

  test("Expression Syntax Linter: All n8n expressions evaluate cleanly", () => {
    const mockCtx = {
      $json: { chat_id: "6386729762", text: "T", send_text: "S", caption: "C", telegram_bot_token: "t",
        runpod_image_endpoint_url: "https://x", runpod_video_endpoint_url: "https://x",
        runpod_payload: { input: { workflow: {} } }, ai_payload: { model: "m", messages: [] }, reply_markup: { inline_keyboard: [] } },
      $: () => ({ first: () => ({ json: { telegram_bot_token: "t", chat_id: "6386729762" } }) })
    };
    for (const n of workflow.nodes) {
      for (const key of ["jsonBody", "url"]) {
        const val = n.parameters?.[key];
        if (val && typeof val === "string" && val.startsWith("={{") && val.endsWith("}}")) {
          const expr = val.slice(3, -2).trim();
          assert.doesNotThrow(() => new Function("$", "$json", `return (${expr});`)(mockCtx.$, mockCtx.$json),
            `Syntax error in ${n.name}.${key}`);
        }
      }
    }
  });

  test("Connection Graph: all node connections follow strict n8n schema with valid target nodes", () => {
    const nodeNames = new Set(workflow.nodes.map(n => n.name));
    for (const [src, conn] of Object.entries(workflow.connections)) {
      assert.ok(nodeNames.has(src), `Unknown source node in connections: ${src}`);
      for (const [outType, outList] of Object.entries(conn)) {
        assert.ok(Array.isArray(outList), `${src}.${outType} must be an array`);
        for (const [idx, group] of outList.entries()) {
          assert.ok(Array.isArray(group), `${src}.${outType}[${idx}] must be an array of connection objects`);
          for (const item of group) {
            assert.equal(typeof item, "object", `Connection item in ${src}.${outType}[${idx}] must be an object`);
            assert.ok(!Array.isArray(item), `Connection item in ${src}.${outType}[${idx}] cannot be an array (triple nesting error)`);
            assert.ok(item.node, `Missing target node property in ${src}.${outType}[${idx}]`);
            assert.ok(nodeNames.has(item.node), `Target node '${item.node}' from '${src}' does not exist in workflow nodes!`);
          }
        }
      }
    }
  });

  test("Dispatcher: fresh greeting returns Welcome Universe selector", () => {
    for (const g of ["hey", "hi", "hello", "/start", "help", "menu"]) {
      const sd = { sessions: {} };
      const out = runCodeNode("Dispatcher_And_State", { telegramUpdate: { message: { chat: { id: 6386729762 }, text: g } }, staticData: sd })[0].json;
      assert.equal(out.event_type, "send_welcome");
      assert.ok(out.text.includes("Welcome to Fluid Motion Studio"), "Missing welcome text for: " + g);
      assert.equal(out.reply_markup.inline_keyboard.length, 3);
    }
  });

  test("Dispatcher (Smart Resume): active session on greeting shows resume prompt", () => {
    const sd = { sessions: { "6386729762": { video_type: "pro", stage: "storyboard_review", idea: "Sam and Miga", storyboard: "Frame 1..." } } };
    const out = runCodeNode("Dispatcher_And_State", { telegramUpdate: { message: { chat: { id: 6386729762 }, text: "hey" } }, staticData: sd })[0].json;
    assert.equal(out.event_type, "send_welcome");
    assert.ok(out.text.includes("Active Production Found"));
    assert.ok(out.text.includes("PRO"));
    assert.ok(out.text.includes("Storyboard Review"));
    assert.equal(out.reply_markup.inline_keyboard[0][0].callback_data, "action:resume");
    assert.equal(out.reply_markup.inline_keyboard[0][1].callback_data, "action:reset");
  });

  test("Dispatcher: /resume with active session shows resume prompt", () => {
    const sd = { sessions: { "6386729762": { video_type: "diva", stage: "image_approved", idea: "Rani runway", reference_image_base64: "abc" } } };
    const out = runCodeNode("Dispatcher_And_State", { telegramUpdate: { message: { chat: { id: 6386729762 }, text: "/resume" } }, staticData: sd })[0].json;
    assert.ok(out.text.includes("Active Production Found"));
    assert.ok(out.text.includes("DIVA"));
    assert.equal(out.reply_markup.inline_keyboard[0][0].callback_data, "action:resume");
  });

  test("Dispatcher: action:resume at storyboard_review routes to show_storyboard_cached", () => {
    const sd = { sessions: { "6386729762": { video_type: "pro", stage: "storyboard_review", storyboard: "Frame 1: assault..." } } };
    const out = runCodeNode("Dispatcher_And_State", { telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "action:resume" } }, staticData: sd })[0].json;
    assert.equal(out.event_type, "show_storyboard_cached");
    assert.equal(out.storyboard, "Frame 1: assault...");
  });

  test("Dispatcher: action:resume at image_approved routes to show_image_cached", () => {
    const sd = { sessions: { "6386729762": { video_type: "pro", stage: "image_approved", reference_image_base64: "abc" } } };
    const out = runCodeNode("Dispatcher_And_State", { telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "action:resume" } }, staticData: sd })[0].json;
    assert.equal(out.event_type, "show_image_cached");
  });

  test("Dispatcher: universe selection shows style picker", () => {
    const sd = { sessions: {} };
    const out = runCodeNode("Dispatcher_And_State", { telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "type:pro" } }, staticData: sd })[0].json;
    assert.equal(out.event_type, "send_message");
    assert.ok(out.text.includes("Visual Style"));
    assert.ok(out.reply_markup.inline_keyboard.some(r => r.some(b => b.callback_data.startsWith("style:"))));
    assert.equal(sd.sessions["6386729762"].video_type, "pro");
    assert.equal(sd.sessions["6386729762"].stage, "selecting_style");
  });

  test("Dispatcher: idea input with universe+style emits gen_world_and_storyboard", () => {
    const sd = { sessions: { "6386729762": { video_type: "pro", style: "cyberpunk", stage: "awaiting_idea" } } };
    const out = runCodeNode("Dispatcher_And_State", { telegramUpdate: { message: { chat: { id: 6386729762 }, text: "Sia chasing a drone" } }, staticData: sd })[0].json;
    assert.equal(out.event_type, "gen_world_and_storyboard");
    assert.equal(out.session.idea, "Sia chasing a drone");
    assert.equal(out.session.style, "cyberpunk");
  });

  test("Dispatcher: action:reset wipes session", () => {
    const sd = { sessions: { "6386729762": { video_type: "pro", idea: "some idea" } } };
    const out = runCodeNode("Dispatcher_And_State", { telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "action:reset" } }, staticData: sd })[0].json;
    assert.equal(out.event_type, "send_welcome");
    assert.deepEqual(sd.sessions["6386729762"], {});
  });

  test("Prep_Storyboard_Prompt: merged 3-section prompt with rosters + style guide", () => {
    const sd = { sessions: { "6386729762": { video_type: "pro", style: "anime", idea: "Sia at dawn" } } };
    const out = runCodeNode("Prep_Storyboard_Prompt", { telegramUpdate: { session: sd.sessions["6386729762"] }, staticData: sd })[0].json;
    assert.ok(out.ai_payload?.messages?.length >= 2);
    const sys = out.ai_payload.messages[0].content;
    assert.ok(sys.includes("WORLDSHEET"));
    assert.ok(sys.includes("STORYBOARD"));
    assert.ok(sys.includes("IMAGE_PROMPT"));
    assert.ok(sys.includes("Sia"), "Must include Sia from Pro roster");
    assert.ok(sys.includes("Anime SDXL"), "Must include anime style guide");
    assert.ok(sys.includes("no text, no words"), "No-text directive required");
    assert.ok(out.ai_payload.messages[1].content.includes("PRO"));
    assert.ok(out.ai_payload.messages[1].content.includes("ANIME"));
    assert.equal(out.ai_payload.model, "google/gemini-2.5-flash");
    assert.equal(out.ai_payload.max_tokens, 4000);
  });

  test("Format_Storyboard_Response: 3-section parse + Telegraph + single Telegram message", async () => {
    const sd = { sessions: { "6386729762": { video_type: "pro", style: "cyberpunk", idea: "Sia drone chase" } } };
    const llmOut = `## SECTION 1 — WORLDSHEET
\`\`\`json
{ "characters": [{ "name": "Sia", "appearance": "White hair", "wardrobe": "Cyborg suit", "props": ["katana"] }], "environment": { "setting": "Neon city", "time_of_day": "3am", "atmosphere": "Rain", "color_palette": ["#FF3366"], "key_details": ["puddles"] }, "style": { "rendering": "cyberpunk", "lens": "24mm", "color_grade": "teal", "special_fx": "rain" } }
\`\`\`
## SECTION 2 — STORYBOARD
**Frame 1**
- **Action:** Sia drops from rooftop
- **Camera:** Low angle
- **Lighting/SFX:** Neon magenta
**Frame 2**
- **Action:** Drone fires blast
- **Camera:** Tracking shot
- **Lighting/SFX:** Blue flash
**Frame 3**
- **Action:** Sia vaults barrier
- **Camera:** Bird eye
- **Lighting/SFX:** Orange vs blue
**Frame 4**
- **Action:** Sia grabs drone
- **Camera:** Close-up
- **Lighting/SFX:** Explosion
### Director Notes
Fast-cut pacing.
## SECTION 3 — IMAGE PROMPT
IMAGE_PROMPT: Multi-panel storyboard grid, 4-panel layout, top-left: Sia drops. top-right: Drone blast. bottom-left: Sia vaults. bottom-right: Sia grabs drone. No text, no words, no letters.`;
    const result = await runCodeNode("Format_Storyboard_Response", { telegramUpdate: { choices: [{ message: { content: llmOut } }] }, staticData: sd });
    assert.equal(result.length, 1, "Must emit exactly 1 message");
    const out = result[0].json;
    assert.equal(out.is_error, false);
    assert.ok(out.send_text.includes("Storyboard Ready"));
    assert.ok(out.send_text.includes("telegra.ph") || out.telegraph_url);
    assert.ok(out.reply_markup?.inline_keyboard);
    assert.ok(sd.sessions["6386729762"].worldSheet, "worldSheet must be saved");
    assert.ok(sd.sessions["6386729762"].storyboard, "storyboard must be saved");
    assert.ok(sd.sessions["6386729762"].imagePrompt, "imagePrompt must be saved");
    assert.equal(sd.sessions["6386729762"].frameCount, 4);
    assert.equal(sd.sessions["6386729762"].stage, "storyboard_review");
    assert.ok(sd.sessions["6386729762"].telegraph_path, "telegraph_path must be stored");
  });

  test("Format_Storyboard_Response: reuses and updates Telegraph in-place on regeneration", async () => {
    let calledUrl = null;
    let sentBody = null;
    const customHttp = {
      request: async (opts) => {
        calledUrl = opts.url;
        sentBody = opts.body;
        return { data: { ok: true, result: { url: "https://telegra.ph/Existing-Path-01", path: "Existing-Path-01" } } };
      }
    };

    const sd = {
      sessions: {
        "6386729762": {
          video_type: "diva",
          style: "anime",
          idea: "Sia cyber katana",
          telegraph_path: "Existing-Path-01",
          telegraph_url: "https://telegra.ph/Existing-Path-01"
        }
      }
    };
    const llmOut = `## SECTION 1 — WORLDSHEET
\`\`\`json
{ "characters": [{ "name": "Sia" }] }
\`\`\`
## SECTION 2 — STORYBOARD
**Frame 1**
- **Action:** Sia katana draw
- **Camera:** 24mm low-angle
- **Lighting & SFX:** Neon sparks
## SECTION 3 — IMAGE PROMPT
IMAGE_PROMPT: Multi-panel grid, no text, no words`;

    const result = await runCodeNode("Format_Storyboard_Response", {
      telegramUpdate: { choices: [{ message: { content: llmOut } }] },
      staticData: sd,
      customHttp
    });
    const out = result[0].json;
    assert.equal(out.is_error, false);
    assert.equal(calledUrl, "https://api.telegra.ph/editPage", "Must call editPage when path exists");
    assert.equal(sentBody.path, "Existing-Path-01", "Must pass existing path to editPage");
    assert.equal(sd.sessions["6386729762"].telegraph_path, "Existing-Path-01");
    assert.equal(sd.sessions["6386729762"].telegraph_url, "https://telegra.ph/Existing-Path-01");
  });

  test("Prep_Storyboard_Prompt: verifies secret sauce for Diva & Pro universes", () => {
    // Diva Universe
    const sdDiva = { sessions: { "6386729762": { video_type: "diva", style: "anime", idea: "Sia fighting Bane" } } };
    const outDiva = runCodeNode("Prep_Storyboard_Prompt", { telegramUpdate: { session: sdDiva.sessions["6386729762"] }, staticData: sdDiva })[0].json;
    const divaPrompt = outDiva.ai_payload.messages[0].content;
    assert.ok(divaPrompt.includes("MANDATORY AESTHETIC STANDARDS"), "Must include aesthetic standards");
    assert.ok(divaPrompt.includes("loose and untied"), "Hair must be loose and untied");
    assert.ok(divaPrompt.includes("DOES NOT wear stockings"), "Sia must not wear stockings");
    assert.ok(divaPrompt.includes("cleavage"), "Must include cleavage/cut specifications");
    assert.ok(divaPrompt.includes("jewelry"), "Heavy jewelry must be mandatory");
    assert.ok(divaPrompt.includes("THE HOOK (FRAME 1)"), "Must enforce viral hook in Frame 1");
    assert.ok(divaPrompt.includes("Gemma"), "Must include Gemma");
    assert.ok(divaPrompt.includes("Rani"), "Must include Rani");

    // Pro Universe
    const sdPro = { sessions: { "6386729762": { video_type: "pro", style: "cyberpunk", idea: "Sam tactical raid" } } };
    const outPro = runCodeNode("Prep_Storyboard_Prompt", { telegramUpdate: { session: sdPro.sessions["6386729762"] }, staticData: sdPro })[0].json;
    const proPrompt = outPro.ai_payload.messages[0].content;
    assert.ok(proPrompt.includes("mandala"), "Sam must include mandala tattoo");
    assert.ok(proPrompt.includes("tiger stripes"), "Sam & Miga must include tiger stripes");
    assert.ok(proPrompt.includes("Alen"), "Must include Alen with lean student build");
  });

  test("Prep_RunPod_Image_Payload: uses imagePrompt + no-text directive", () => {
    const imgPrompt = "Multi-panel storyboard grid, 4-panel layout, Sia drops from rooftop in neon rain...";
    const sd = { sessions: { "6386729762": { imagePrompt: imgPrompt, frameCount: 4 } } };
    const out = runCodeNode("Prep_RunPod_Image_Payload", { telegramUpdate: { session: sd.sessions["6386729762"] }, staticData: sd })[0].json;
    const wf = out.runpod_payload?.input?.workflow;
    assert.ok(wf, "Must have workflow");
    assert.equal(wf["1"].inputs.ckpt_name, "animagine-xl-4.0.safetensors");
    assert.ok(wf["2"].inputs.text.includes("Multi-panel storyboard grid"), "Must use session.imagePrompt");
    assert.ok(wf["3"].inputs.text.includes("watermark"), "Negative must have watermark");
    assert.ok(wf["3"].inputs.text.includes("subtitles"), "Negative must have subtitles");
    assert.equal(wf["4"].inputs.width, 1280);
    assert.equal(wf["4"].inputs.height, 720);
  });

  test("Process_Image_Output: parses RunPod image output and sets binary photo", () => {
    const sd = { sessions: { "6386729762": { video_type: "pro" } } };
    const runpodOut = { status: "COMPLETED", output: { images: [{ name: "f.png", data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" }] } };
    const result = runCodeNode("Process_Image_Output", { telegramUpdate: runpodOut, staticData: sd })[0];
    assert.equal(result.json.is_error, false);
    assert.ok(result.json.caption.includes("Reference Image Rendered"));
    assert.ok(result.binary?.photo?.data);
    assert.equal(result.json.reply_markup.inline_keyboard[0][0].callback_data, "action:confirm_image");
  });

  test("Dispatch_Video_Job: formats video pipeline status", () => {
    const sd = { sessions: { "6386729762": { storyboard: "Frame 1: chase.", imagePrompt: "Multi-panel..." } } };
    const out = runCodeNode("Dispatch_Video_Job", { telegramUpdate: { chat_id: "6386729762", session: sd.sessions["6386729762"] }, staticData: sd })[0].json;
    assert.ok(out.send_text.includes("Video Render Pipeline Engaged"));
    assert.ok(out.send_text.includes("Standard (LTX Video Worker)") || out.send_text.includes("Standard \\(LTX Video Worker\\)"));
    assert.equal(out.reply_markup.inline_keyboard[0][0].callback_data, "action:reset");
  });

  test("parse_mode configuration: MarkdownV2 on message/storyboard/status nodes, HTML on progress nodes", () => {
    const mdNodes = ["Send_Welcome_Telegram", "Send_Message_Telegram", "Send_Storyboard_Telegram", "Send_Video_Status_Telegram"];
    for (const name of mdNodes) {
      const n = workflow.nodes.find(node => node.name === name);
      if (!n) continue;
      const jb = n.parameters?.jsonBody || "";
      assert.ok(jb.includes("MarkdownV2"), `${name} must use MarkdownV2`);
    }

    const htmlNodes = ["Send_Storyboard_Progress", "Send_Image_Progress"];
    for (const name of htmlNodes) {
      const n = workflow.nodes.find(node => node.name === name);
      if (!n) continue;
      const jb = n.parameters?.jsonBody || "";
      assert.ok(jb.includes("HTML"), `${name} must use HTML mode`);
      assert.equal(n.parameters?.options?.response?.response?.neverError, true, `${name} must have neverError: true`);
    }
  });

});


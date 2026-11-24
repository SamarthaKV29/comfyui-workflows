import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const workflowPath = path.resolve("n8n/workflows/content-social/linkedin-daily-writer/02_research_publish_agent.json");
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));

function getNode(name) {
  const node = workflow.nodes.find(n => n.name === name);
  if (!node) throw new Error(`Node not found: ${name}`);
  return node;
}

function runCodeNode(nodeName, { telegramUpdate, staticData = {}, priorNodes = {} }) {
  const node = getNode(nodeName);
  const code = node.parameters.jsCode;

  const defaultUserConfig = {
    authorized_chat_id: "6386729762",
    telegram_bot_token: "test_token",
    openrouter_api_key: "test_key",
    openrouter_model: "google/gemma-4-31b-it:free",
    linkedin_author_urn: "urn:li:person:dH38GqfHh5"
  };

  const nodeMap = {
    Telegram_Trigger: { first: () => ({ json: telegramUpdate || {} }) },
    User_Config: { first: () => ({ json: defaultUserConfig }) },
    ...priorNodes
  };

  const $ = (name) => {
    if (nodeMap[name]) return nodeMap[name];
    return { first: () => ({ json: {} }) };
  };

  const $getWorkflowStaticData = (type) => staticData;
  const $json = telegramUpdate || {};

  const fn = new Function("$", "$json", "$getWorkflowStaticData", code);
  return fn($, $json, $getWorkflowStaticData);
}

describe("LinkedIn Workflow 02 - Unit Tests", () => {

  test("Security & Sandbox: Zero disallowed fs / child_process modules", () => {
    for (const node of workflow.nodes) {
      const code = node.parameters?.jsCode || "";
      assert.doesNotMatch(code, /\\brequire\\s*\\(\\s*['"]fs['"]\\s*\\)/, `Node ${node.name} imports fs!`);
      assert.doesNotMatch(code, /\\brequire\\s*\\(\\s*['"]child_process['"]\\s*\\)/, `Node ${node.name} imports child_process!`);
    }
  });

  test("Expression Syntax Linter: All n8n expressions evaluate cleanly", () => {
    const mockContext = {
      $json: {
        chat_id: "6386729762",
        greeting_text: "Hello Sam",
        reply_markup: undefined,
        topic: "Test topic",
        persona: "engineer",
        hook1: "h1", hook2: "h2", hook3: "h3",
        post_content: "draft",
        word_count: 500
      },
      $: (name) => ({
        first: () => ({
          json: {
            telegram_bot_token: "token",
            chat_id: "6386729762",
            word_count: 500
          }
        })
      })
    };

    for (const node of workflow.nodes) {
      const jb = node.parameters?.jsonBody;
      if (jb && jb.startsWith("={{") && jb.endsWith("}}")) {
        const expr = jb.slice(3, -2).trim();
        assert.doesNotThrow(() => {
          const fn = new Function("$", "$json", `return (${expr});`);
          fn(mockContext.$, mockContext.$json);
        }, `Expression syntax error in node ${node.name}: ${jb}`);
      }
    }
  });

  test("Dispatcher: \"hey\" sends greeting card with non-empty text", () => {
    const staticData = { sessions: {} };
    const result = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { message: { chat: { id: 6386729762 }, text: "hey" } },
      staticData
    });

    const output = result[0].json;
    assert.equal(output.event_type, "greeting");
    assert.ok(output.greeting_text, "greeting_text must not be empty");
    assert.match(output.greeting_text, /Hey Sam!/);
  });

  test("Dispatcher: \"/resume\" without active session sends greeting with non-empty text", () => {
    const staticData = { sessions: {} };
    const result = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { message: { chat: { id: 6386729762 }, text: "/resume" } },
      staticData
    });

    const output = result[0].json;
    assert.equal(output.event_type, "greeting");
    assert.ok(output.greeting_text, "greeting_text must not be empty on /resume without active session!");
    assert.match(output.greeting_text, /Hey Sam!/);
  });

  test("Dispatcher: \"/resume\" with active session restores exact step", () => {
    const staticData = {
      sessions: {
        "6386729762": {
          topic: "Building Autonomous Agents",
          persona: "engineer",
          step: "prompt_tone"
        }
      }
    };
    const result = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { message: { chat: { id: 6386729762 }, text: "/resume" } },
      staticData
    });

    const output = result[0].json;
    assert.equal(output.event_type, "prompt_tone");
    assert.equal(output.topic, "Building Autonomous Agents");
  });

  test("Dispatcher: \"/cancel\" resets active session", () => {
    const staticData = {
      sessions: {
        "6386729762": { topic: "Old Topic" }
      }
    };
    const result = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { message: { chat: { id: 6386729762 }, text: "/cancel" } },
      staticData
    });

    const output = result[0].json;
    assert.equal(output.event_type, "cancelled");
    assert.deepEqual(staticData.sessions["6386729762"], {});
  });

  test("Dispatcher: valid new topic starts Format selection & extracts URLs", () => {
    const staticData = { sessions: {}, history: [] };
    const result = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: {
        message: {
          chat: { id: 6386729762 },
          text: "Why deterministic state beats cache https://fastkode.com/blog/state"
        }
      },
      staticData
    });

    const output = result[0].json;
    assert.equal(output.event_type, "prompt_format");
    assert.equal(output.urls.length, 1);
    assert.equal(output.urls[0], "https://fastkode.com/blog/state");
  });

  test("Dispatcher: callback 'fmt:post' sets format to post and prompts persona", () => {
    const staticData = {
      sessions: {
        "6386729762": { topic: "Why deterministic state beats cache" }
      }
    };
    const result = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "fmt:post" } },
      staticData
    });

    const output = result[0].json;
    assert.equal(output.event_type, "prompt_persona");
    assert.equal(output.format, "post");
    assert.equal(staticData.sessions["6386729762"].format, "post");
  });

  test("Dispatcher: callback 'fmt:article' sets format to article and prompts persona", () => {
    const staticData = {
      sessions: {
        "6386729762": { topic: "Why deterministic state beats cache" }
      }
    };
    const result = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "fmt:article" } },
      staticData
    });

    const output = result[0].json;
    assert.equal(output.event_type, "prompt_persona");
    assert.equal(output.format, "article");
    assert.equal(staticData.sessions["6386729762"].format, "article");
  });

  test("Dispatcher: duplicate topic triggers dedup card instead of re-running AI", () => {
    const staticData = {
      sessions: {},
      history: [
        {
          chatId: "6386729762",
          topic: "Why deterministic state beats cache in production systems",
          draft: "Cached draft content here..."
        }
      ]
    };
    const result = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: {
        message: {
          chat: { id: 6386729762 },
          text: "deterministic state beats cache in production systems"
        }
      },
      staticData
    });

    const output = result[0].json;
    assert.equal(output.event_type, "dup_found");
    assert.equal(output.draft, "Cached draft content here...");
  });

  test("Dispatcher: callback queries route properly (p:leader, t:compare, h:1, action:publish)", () => {
    const staticData = {
      sessions: {
        "6386729762": {
          topic: "Scale",
          persona: "leader",
          hooks: ["Hook 0", "Hook 1", "Hook 2"],
          draft: "Full draft body"
        }
      }
    };

    let res = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "p:leader" } },
      staticData
    });
    assert.equal(res[0].json.event_type, "prompt_tone");

    res = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "t:compare" } },
      staticData
    });
    assert.equal(res[0].json.event_type, "gen_hooks");

    res = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "h:1" } },
      staticData
    });
    assert.equal(res[0].json.event_type, "gen_body");
    assert.equal(res[0].json.chosenHook, "Hook 1");

    res = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "h:regen" } },
      staticData
    });
    assert.equal(res[0].json.event_type, "gen_hooks");
    assert.equal(res[0].json.isRegenHooks, true);

    res = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "action:publish" } },
      staticData
    });
    assert.equal(res[0].json.event_type, "publish_linkedin");
  });

  test("Dispatcher: \"/resume\" when draft is ready returns show_draft with buttons & chosen hook preserved", () => {
    const staticData = {
      sessions: {
        "6386729762": {
          topic: "Boring Company 150km tunnels in UAE",
          format: "post",
          persona: "leader",
          tone: "condescending",
          chosenHook: "While America debates infrastructure, Musk won 150km in UAE.",
          draft: "While America debates infrastructure, Musk won 150km in UAE.\n\nHere is the real breakdown of speed.\n\nEngineering beats red tape.",
          step: "draft_ready"
        }
      }
    };

    const res = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { message: { chat: { id: 6386729762 }, text: "/resume" } },
      staticData
    });

    const output = res[0].json;
    assert.equal(output.event_type, "show_draft");
    assert.equal(output.chosenHook, "While America debates infrastructure, Musk won 150km in UAE.");
    assert.ok(output.draft_card_text.includes("LinkedIn Feed Post Ready"));
    assert.ok(output.reply_markup.inline_keyboard.length > 0);
  });

  test("Code Node Syntax: Prepare_Body_Prompt compiles and evaluates cleanly without SyntaxError", () => {
    const staticData = {
      sessions: {
        "6386729762": {
          topic: "Boring Company in UAE",
          format: "post",
          persona: "leader",
          tone: "condescending",
          chosenHook: "While America debates infrastructure, Musk won 150km in UAE."
        }
      }
    };

    assert.doesNotThrow(() => {
      const res = runCodeNode("Prepare_Body_Prompt", {
        telegramUpdate: { chat_id: "6386729762", chosenHook: "While America debates infrastructure, Musk won 150km in UAE." },
        staticData
      });
      assert.ok(res[0].json.ai_payload);
      assert.equal(res[0].json.ai_payload.messages.length, 2);
    });
  });

  test("Error Handling: Parse_Hooks_Output formats error message and retry buttons on failure", () => {
    const staticData = {
      sessions: {
        "6386729762": { topic: "AI in UAE" }
      }
    };

    const priorNodes = {
      Prepare_Hooks_Prompt: { first: () => ({ json: { chat_id: "6386729762", telegram_bot_token: "test_tok" } }) }
    };

    const errorPayload = {
      error: { message: "Rate limit exceeded on OpenRouter", code: 429 },
      statusCode: 429
    };

    const res = runCodeNode("Parse_Hooks_Output", {
      telegramUpdate: errorPayload,
      staticData,
      priorNodes
    });

    const output = res[0].json;
    assert.equal(output.is_error, true);
    assert.match(output.card_text, /OpenRouter Error Generating Hooks/);
    assert.match(output.card_text, /Rate limit exceeded/);
    assert.equal(output.reply_markup.inline_keyboard[0][0].callback_data, "h:regen");
  });

  test("Error Handling: Format_Draft_Card formats error message and retry buttons on failure", () => {
    const staticData = {
      sessions: {
        "6386729762": { topic: "AI in UAE", chosenHook: "Hook 1" }
      }
    };

    const priorNodes = {
      Prepare_Body_Prompt: { first: () => ({ json: { chat_id: "6386729762", telegram_bot_token: "test_tok", linkedin_author_urn: "urn:123" } }) }
    };

    const errorPayload = {
      error: { message: "Internal server error on provider", code: 500 },
      statusCode: 500
    };

    const res = runCodeNode("Format_Draft_Card", {
      telegramUpdate: errorPayload,
      staticData,
      priorNodes
    });

    const output = res[0].json;
    assert.match(output.draft_card_text, /OpenRouter Error Generating Draft/);
    assert.match(output.draft_card_text, /Internal server error/);
    assert.equal(output.reply_markup.inline_keyboard[0][0].callback_data, "action:regenerate");
  });

  test("Dispatcher: callback 'action:use_cached' restores draft and outputs show_draft with action buttons", () => {
    const staticData = {
      sessions: {
        "6386729762": {
          topic: "Boring Company in UAE",
          cachedDraft: "Boring Company 150km tunnels in UAE are under way.\n\nEngineering speed wins.",
          format: "post"
        }
      }
    };

    const res = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "action:use_cached" } },
      staticData
    });

    const output = res[0].json;
    assert.equal(output.event_type, "show_draft");
    assert.equal(output.post_content, "Boring Company 150km tunnels in UAE are under way.\n\nEngineering speed wins.");
    assert.ok(output.draft_card_text.includes("LinkedIn Feed Post Ready"));
    assert.equal(output.reply_markup.inline_keyboard[0][0].text.includes("Publish to LinkedIn"), true);
    assert.equal(staticData.sessions["6386729762"].step, "draft_ready");
  });

  test("Dispatcher: callback 'action:start_fresh' clears cache and prompts format selection", () => {
    const staticData = {
      sessions: {
        "6386729762": {
          topic: "Boring Company in UAE",
          cachedDraft: "Old draft",
          draft: "Old draft"
        }
      }
    };

    const res = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "action:start_fresh" } },
      staticData
    });

    const output = res[0].json;
    assert.equal(output.event_type, "prompt_format");
    assert.equal(staticData.sessions["6386729762"].draft, undefined);
    assert.equal(staticData.sessions["6386729762"].cachedDraft, undefined);
    assert.equal(staticData.sessions["6386729762"].step, "prompt_format");
  });

  test("Dispatcher: '/resume' when only cachedDraft is present restores show_draft", () => {
    const staticData = {
      sessions: {
        "6386729762": {
          topic: "Boring Company in UAE",
          cachedDraft: "Cached draft content",
          step: "dup_found"
        }
      }
    };

    const res = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { message: { chat: { id: 6386729762 }, text: "/resume" } },
      staticData
    });

    const output = res[0].json;
    assert.equal(output.event_type, "show_draft");
    assert.equal(output.post_content, "Cached draft content");
  });

  test("Dispatcher: 'action:regenerate' recovers hook from draft when chosenHook is not set", () => {
    const staticData = {
      sessions: {
        "6386729762": {
          topic: "Boring Company in UAE",
          draft: "Musk is drilling 150km of tunnels in UAE.\n\nParagraph 2 breakdown.",
          format: "post"
        }
      }
    };

    const res = runCodeNode("Dispatcher_And_Dedup", {
      telegramUpdate: { callback_query: { message: { chat: { id: 6386729762 } }, data: "action:regenerate" } },
      staticData
    });

    const output = res[0].json;
    assert.equal(output.event_type, "gen_body");
    assert.equal(output.chosenHook, "Musk is drilling 150km of tunnels in UAE.");
    assert.equal(staticData.sessions["6386729762"].chosenHook, "Musk is drilling 150km of tunnels in UAE.");
  });

  test("Publish_To_LinkedIn: uses valid, active LinkedIn-Version header (202608)", () => {
    const publishNode = getNode("Publish_To_LinkedIn");
    const headers = publishNode.parameters?.headerParameters?.parameters || [];
    const versionHeader = headers.find(h => h.name === "LinkedIn-Version");
    assert.ok(versionHeader, "LinkedIn-Version header is missing!");
    assert.equal(versionHeader.value, "202608", "LinkedIn-Version must be updated to active 202608 version!");
  });

});





<docs>
<doc>
# Selectors
## Reddit
### Main post
[slot='text-body']
### Comments
[slot='comment']

## Hacker News
### Main post
.toptext (but also main post can be missing)
### Comments
.commtext
</doc>
<doc>
Generating JSON
---------------

There are two ways to generate JSON using the Gemini API:

*   Configure a schema on the model
*   Provide a schema in a text prompt

Configuring a schema on the model is the **recommended** way to generate JSON, because it constrains the model to output JSON.

### Configuring a schema (recommended)

To constrain the model to generate JSON, configure a `responseSchema`. The model will then respond to any prompt with JSON-formatted output.


### REST

```
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
-H "x-goog-api-key: $GEMINI_API_KEY" \
-H 'Content-Type: application/json' \
-d '{
      "contents": [{
        "parts":[
          { "text": "List a few popular cookie recipes, and include the amounts of ingredients." }
        ]
      }],
      "generationConfig": {
        "responseMimeType": "application/json",
        "responseSchema": {
          "type": "ARRAY",
          "items": {
            "type": "OBJECT",
            "properties": {
              "recipeName": { "type": "STRING" },
              "ingredients": {
                "type": "ARRAY",
                "items": { "type": "STRING" }
              }
            },
            "propertyOrdering": ["recipeName", "ingredients"]
          }
        }
      }
}' 2> /dev/null | head
```

### Providing a schema in a text prompt

Instead of configuring a schema, you can supply a schema as natural language or pseudo-code in a text prompt. This method is **not recommended**, because it might produce lower quality output, and because the model is not constrained to follow the schema.

Here's a generic example of a schema provided in a text prompt:

```
List a few popular cookie recipes, and include the amounts of ingredients.

Produce JSON matching this specification:

Recipe = { "recipeName": string, "ingredients": array<string> }
Return: array<Recipe>

```


Since the model gets the schema from text in the prompt, you might have some flexibility in how you represent the schema. But when you supply a schema inline like this, the model is not actually constrained to return JSON. For a more deterministic, higher quality response, configure a schema on the model, and don't duplicate the schema in the text prompt.

Generating enum values
----------------------

In some cases you might want the model to choose a single option from a list of options. To implement this behavior, you can pass an _enum_ in your schema. You can use an enum option anywhere you could use a `string` in the `responseSchema`, because an enum is an array of strings. Like a JSON schema, an enum lets you constrain model output to meet the requirements of your application.

For example, assume that you're developing an application to classify musical instruments into one of five categories: `"Percussion"`, `"String"`, `"Woodwind"`, `"Brass"`, or "`"Keyboard"`". You could create an enum to help with this task.

In the following example, you pass an enum as the `responseSchema`, constraining the model to choose the most appropriate option.

### REST

```
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
-H "x-goog-api-key: $GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -d '{
          "contents": [{
            "parts":[
              { "text": "What type of instrument is an oboe?" }
            ]
          }],
          "generationConfig": {
            "responseMimeType": "text/x.enum",
            "responseSchema": {
              "type": "STRING",
              "enum": ["Percussion", "String", "Woodwind", "Brass", "Keyboard"]
            }
          }
    }'

```

About JSON schemas
------------------

Configuring the model for JSON output using `responseSchema` parameter relies on `Schema` object to define its structure. This object represents a select subset of the [OpenAPI 3.0 Schema object](https://spec.openapis.org/oas/v3.0.3#schema-object), and also adds a `propertyOrdering` field.

Here's a pseudo-JSON representation of all the `Schema` fields:

```
{
  "type": enum (Type),
  "format": string,
  "description": string,
  "nullable": boolean,
  "enum": [
    string
  ],
  "maxItems": integer,
  "minItems": integer,
  "properties": {
    string: {
      object (Schema)
    },
    ...
  },
  "required": [
    string
  ],
  "propertyOrdering": [
    string
  ],
  "items": {
    object (Schema)
  }
}

```


The `Type` of the schema must be one of the OpenAPI [Data Types](https://spec.openapis.org/oas/v3.0.3#data-types), or a union of those types (using `anyOf`). Only a subset of fields is valid for each `Type`. The following list maps each `Type` to a subset of the fields that are valid for that type:

*   `string` -> `enum`, `format`, `nullable`
*   `integer` -> `format`, `minimum`, `maximum`, `enum`, `nullable`
*   `number` -> `format`, `minimum`, `maximum`, `enum`, `nullable`
*   `boolean` -> `nullable`
*   `array` -> `minItems`, `maxItems`, `items`, `nullable`
*   `object` -> `properties`, `required`, `propertyOrdering`, `nullable`

Here are some example schemas showing valid type-and-field combinations:

```
{ "type": "string", "enum": ["a", "b", "c"] }

{ "type": "string", "format": "date-time" }

{ "type": "integer", "format": "int64" }

{ "type": "number", "format": "double" }

{ "type": "boolean" }

{ "type": "array", "minItems": 3, "maxItems": 3, "items": { "type": ... } }

{ "type": "object",
  "properties": {
    "a": { "type": ... },
    "b": { "type": ... },
    "c": { "type": ... }
  },
  "nullable": true,
  "required": ["c"],
  "propertyOrdering": ["c", "b", "a"]
}

```


For complete documentation of the Schema fields as they're used in the Gemini API, see the [Schema reference](about:/api/caching#Schema).

### Property ordering

When you're working with JSON schemas in the Gemini API, the order of properties is important. By default, the API orders properties alphabetically and does not preserve the order in which the properties are defined (although the [Google Gen AI SDKs](https://ai.google.dev/gemini-api/docs/sdks) may preserve this order). If you're providing examples to the model with a schema configured, and the property ordering of the examples is not consistent with the property ordering of the schema, the output could be rambling or unexpected.

To ensure a consistent, predictable ordering of properties, you can use the optional `propertyOrdering[]` field.

```
"propertyOrdering": ["recipeName", "ingredients"]

```


`propertyOrdering[]` – not a standard field in the OpenAPI specification – is an array of strings used to determine the order of properties in the response. By specifying the order of properties and then providing examples with properties in that same order, you can potentially improve the quality of results. `propertyOrdering` is only supported when you manually create `types.Schema`.

### JSON Schema support

[JSON Schema](https://json-schema.org/) is a more recent specification than OpenAPI 3.0, which the [Schema](about:/api/caching#Schema) object is based on. Support for JSON Schema is available as a preview using the field [`responseJsonSchema`](about:/api/generate-content#FIELDS.response_json_schema) which accepts any JSON Schema with the following limitations:

*   It only works with Gemini 2.5.
*   While all JSON Schema properties can be passed, not all are supported. See the [documentation](about:/api/generate-content#FIELDS.response_json_schema) for the field for more details.
*   Recursive references can only be used as the value of a non-required object property.
*   Recursive references are unrolled to a finite degree, based on the size of the schema.
*   Schemas that contain `$ref` cannot contain any properties other than those starting with a `$`.

Here's an example of generating a JSON Schema with Pydantic and submitting it to the model:

```
curl "https://generativelanguage.googleapis.com/v1alpha/models/\
gemini-2.5-flash:generateContent" \
    -H "x-goog-api-key: $GEMINI_API_KEY"\
    -H 'Content-Type: application/json' \
    -d @- <<EOF
{
  "contents": [{
    "parts":[{
      "text": "Please give a random example following this schema"
    }]
  }],
  "generationConfig": {
    "response_mime_type": "application/json",
    "response_json_schema": $(python3 - << PYEOF
from enum import Enum
from typing import List, Optional, Union, Set
from pydantic import BaseModel, Field, ConfigDict
import json

class UserRole(str, Enum):
    ADMIN = "admin"
    VIEWER = "viewer"

class Address(BaseModel):
    street: str
    city: str

class UserProfile(BaseModel):
    username: str = Field(description="User's unique name")
    age: Optional[int] = Field(ge=0, le=120)
    roles: Set[UserRole] = Field(min_items=1)
    contact: Union[Address, str]
    model_config = ConfigDict(title="User Schema")

# Generate and print the JSON Schema
print(json.dumps(UserProfile.model_json_schema(), indent=2))
PYEOF
)
  }
}
EOF

```


Passing JSON Schema directly is not yet supported when using the SDK.

Best practices
--------------

Keep the following considerations and best practices in mind when you're using a response schema:

*   The size of your response schema counts towards the input token limit.
*   By default, fields are optional, meaning the model can populate the fields or skip them. You can set fields as required to force the model to provide a value. If there's insufficient context in the associated input prompt, the model generates responses mainly based on the data it was trained on.
*   A complex schema can result in an `InvalidArgument: 400` error. Complexity might come from long property names, long array length limits, enums with many values, objects with lots of optional properties, or a combination of these factors.
    
    If you get this error with a valid schema, make one or more of the following changes to resolve the error:
    
    *   Shorten property names or enum names.
    *   Flatten nested arrays.
    *   Reduce the number of properties with constraints, such as numbers with minimum and maximum limits.
    *   Reduce the number of properties with complex constraints, such as properties with complex formats like `date-time`.
    *   Reduce the number of optional properties.
    *   Reduce the number of valid values for enums.
*   If you aren't seeing the results you expect, add more context to your input prompts or revise your response schema. For example, review the model's response without structured output to see how the model responds. You can then update your response schema so that it better fits the model's output.
</doc>
<doc>
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
-H "x-goog-api-key: $GEMINI_API_KEY" \
-H 'Content-Type: application/json' \
-X POST \
-d '{
  "contents": [
    {
      "parts": [
        {
          "text": "Provide a list of 3 famous physicists and their key contributions"
        }
      ]
    }
  ],
  "generationConfig": {
    "thinkingConfig": {
          "thinkingBudget": 1024
          # Thinking off:
          # "thinkingBudget": 0
          # Turn on dynamic thinking:
          # "thinkingBudget": -1
    }
  }
}'
</doc>
<doc>
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "system_instruction": {
      "parts": [
        {
          "text": "You are a cat. Your name is Neko."
        }
      ]
    },
    "contents": [
      {
        "parts": [
          {
            "text": "Hello there"
          }
        ]
      }
    ]
  }'
</doc>
<doc>
### Where is the best place to put my query in the context window?

In most cases, especially if the total context is long, the model's performance will be better if you put your query / question at the end of the prompt (after all the other context).
</doc>
<doc>
Chrome extensions
=================

Introduction
------------

note

Extensions only work in Chrome / Chromium launched with a persistent context. Use custom browser args at your own risk, as some of them may break Playwright functionality.

The snippet below retrieves the service worker of a Manifest v3 extension whose source is located in `./my-extension`.

Note the use of the `chromium` channel that allows to run extensions in headless mode. Alternatively, you can launch the browser in headed mode.

```ts
const { chromium } = require('playwright');

(async () => {
  const pathToExtension = require('path').join(__dirname, 'my-extension');
  const userDataDir = '/tmp/test-user-data-dir';
  const browserContext = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`
    ]
  });
  let [serviceWorker] = browserContext.serviceWorkers();
  if (!serviceWorker)
    serviceWorker = await browserContext.waitForEvent('serviceworker');

  // Test the service worker as you would any other worker.
  await browserContext.close();
})();
```

Testing
-------

To have the extension loaded when running tests you can use a test fixture to set the context. You can also dynamically retrieve the extension id and use it to load and test the popup page for example.

Note the use of the `chromium` channel that allows to run extensions in headless mode. Alternatively, you can launch the browser in headed mode.

First, add fixtures that will load the extension:

fixtures.ts
```ts
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({ }, use) => {
    const pathToExtension = path.join(__dirname, 'my-extension');
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // for manifest v3:
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker)
      serviceWorker = await context.waitForEvent('serviceworker');

    const extensionId = serviceWorker.url().split('/')[2];
    await use(extensionId);
  },
});
export const expect = test.expect;
```

Then use these fixtures in a test:

```ts
import { test, expect } from './fixtures';

test('example test', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page.locator('body')).toHaveText('Changed by my-extension');
});

test('popup page', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.locator('body')).toHaveText('my-extension popup');
});
```
</doc>
</docs>
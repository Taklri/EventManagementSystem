export const REGISTRATION_ITEM_TYPES = [
  "text",
  "shortText",
  "longText",
  "multipleChoice",
  "multipleAnswer",
  "dropdown",
  "radio",
  "instructions",
];

const CHOICE_TYPES = new Set(["multipleChoice", "multipleAnswer", "dropdown", "radio"]);
const TEXT_LIMITS = { text: 2000, shortText: 240, longText: 2000 };
const getOptionLimit = (type) => (type === "multipleChoice" ? 10 : 12);

const issue = (path, message) => ({ path, message });

export const normalizeRegistrationForm = (input, version = 1) => {
  const items = Array.isArray(input) ? input : input?.items;
  if (!Array.isArray(items) || items.length > 12) {
    return { issues: [issue("registrationForm", "Add up to 12 form items.")] };
  }

  const seen = new Set();
  const issues = [];
  const normalized = items.map((item, index) => {
    const path = `registrationForm.items.${index}`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      issues.push(issue(path, "Form item must be an object."));
      return null;
    }
    const key = typeof item.key === "string" ? item.key.trim() : "";
    const type = item.type;
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const helpText = item.helpText === undefined ? "" : item.helpText;
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(key) || seen.has(key)) {
      issues.push(issue(`${path}.key`, "Each form item needs a unique key."));
    }
    seen.add(key);
    if (!REGISTRATION_ITEM_TYPES.includes(type)) {
      issues.push(issue(`${path}.type`, "Choose a valid question type."));
    }
    const labelMin = type === "text" ? 5 : 2;
    const labelMax = type === "text" ? 100 : type === "instructions" ? 1000 : 160;
    if (label.length < labelMin || label.length > labelMax) {
      issues.push(issue(`${path}.label`, `Text must be ${labelMin} to ${labelMax} characters.`));
    }
    if (typeof helpText !== "string" || helpText.trim().length > 500) {
      issues.push(issue(`${path}.helpText`, "Help text must be 500 characters or fewer."));
    }
    if (item.required !== undefined && typeof item.required !== "boolean") {
      issues.push(issue(`${path}.required`, "Required must be true or false."));
    }
    const options = item.options === undefined ? [] : item.options;
    if (CHOICE_TYPES.has(type)) {
      const optionLimit = getOptionLimit(type);
      if (!Array.isArray(options) || options.length < 2 || options.length > optionLimit) {
        issues.push(issue(`${path}.options`, `Add 2 to ${optionLimit} options.`));
      } else {
        const clean = options.map((value) => typeof value === "string" ? value.trim() : "");
        if (clean.some((value) => !value || value.length > 120) || new Set(clean).size !== clean.length) {
          issues.push(issue(`${path}.options`, "Options must be unique text of 1 to 120 characters."));
        }
      }
    } else if (!Array.isArray(options) || options.length > 0) {
      issues.push(issue(`${path}.options`, "This item type cannot have options."));
    }
    if (type === "instructions" && item.required) {
      issues.push(issue(`${path}.required`, "Instruction blocks cannot require an answer."));
    }
    return {
      key,
      type,
      label,
      helpText: typeof helpText === "string" ? helpText.trim() : "",
      required: type === "instructions" ? false : Boolean(item.required),
      options: CHOICE_TYPES.has(type) && Array.isArray(options)
        ? options.map((value) => typeof value === "string" ? value.trim() : "")
        : [],
    };
  });

  if (issues.length) return { issues };
  return { value: { version, items: normalized } };
};

export const validateRegistrationAnswers = (form, submitted) => {
  const items = form?.items || [];
  if (!Array.isArray(submitted)) {
    return { issues: [issue("answers", "Submit the registration form before joining.")] };
  }
  const issues = [];
  const byKey = new Map();
  for (const [index, answer] of submitted.entries()) {
    if (!answer || typeof answer !== "object" || Array.isArray(answer) || typeof answer.key !== "string") {
      issues.push(issue(`answers.${index}`, "Invalid answer."));
      continue;
    }
    if (byKey.has(answer.key)) issues.push(issue(`answers.${answer.key}`, "Answer was submitted twice."));
    byKey.set(answer.key, answer.value);
  }
  const known = new Set(items.map((item) => item.key));
  for (const key of byKey.keys()) {
    if (!known.has(key)) issues.push(issue(`answers.${key}`, "This question is not in the current form."));
  }
  const answers = [];
  for (const item of items) {
    const path = `answers.${item.key}`;
    const value = byKey.get(item.key);
    if (item.type === "instructions") {
      if (byKey.has(item.key)) issues.push(issue(path, "Instruction blocks do not accept answers."));
      continue;
    }
    if (item.type === "multipleAnswer") {
      const selected = value === undefined ? [] : value;
      if (!Array.isArray(selected) || selected.length > item.options.length
        || selected.some((choice) => typeof choice !== "string" || !item.options.includes(choice))
        || new Set(selected).size !== selected.length) {
        issues.push(issue(path, "Choose valid, unique options."));
        continue;
      }
      if (item.required && !selected.length) issues.push(issue(path, "Choose at least one option."));
      answers.push({ key: item.key, label: item.label, value: selected });
      continue;
    }
    if (item.type === "multipleChoice") {
      // Legacy forms used multipleChoice for arrays. Keep accepting those
      // answers while new forms use the item as a single-answer question.
      if (Array.isArray(value)) {
        const selected = value;
        if (selected.length > item.options.length
          || selected.some((choice) => typeof choice !== "string" || !item.options.includes(choice))
          || new Set(selected).size !== selected.length) {
          issues.push(issue(path, "Choose valid, unique options."));
          continue;
        }
        if (item.required && !selected.length) issues.push(issue(path, "Choose at least one option."));
        answers.push({ key: item.key, label: item.label, value: selected });
        continue;
      }
      if (value !== undefined && (typeof value !== "string" || (value && !item.options.includes(value)))) {
        issues.push(issue(path, "Choose one of the available options."));
        continue;
      }
      if (item.required && !value) issues.push(issue(path, "Choose an option."));
      answers.push({ key: item.key, label: item.label, value: value || "" });
      continue;
    }
    if (item.type === "dropdown" || item.type === "radio") {
      if (value !== undefined && (typeof value !== "string" || (value && !item.options.includes(value)))) {
        issues.push(issue(path, "Choose one of the available options."));
        continue;
      }
      if (item.required && !value) issues.push(issue(path, "Choose an option."));
      answers.push({ key: item.key, label: item.label, value: value || "" });
      continue;
    }
    if (typeof value !== "string" && value !== undefined) {
      issues.push(issue(path, "Enter text for this question."));
      continue;
    }
    const text = typeof value === "string" ? value.trim() : "";
    if (text.length > TEXT_LIMITS[item.type]) issues.push(issue(path, `Use ${TEXT_LIMITS[item.type]} characters or fewer.`));
    if (item.required && !text) issues.push(issue(path, "This question is required."));
    answers.push({ key: item.key, label: item.label, value: text });
  }
  return issues.length ? { issues } : { value: answers };
};

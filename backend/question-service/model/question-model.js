import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ParamSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
  },
  { _id: false }
);

const SignatureSchema = new Schema(
  {
    params: { type: [ParamSchema], default: [] },
    returnType: { type: String, default: "any" },
  },
  { _id: false }
);

const ExampleSchema = new Schema(
  {
    input: String,
    output: String,
    explanation: String,
    image: {
      url: { type: String },
      provider: { type: String },
      key: { type: String },
      width: Number,
      height: Number,
      mime: String,
      size: Number,
    },
  },
  { _id: false }
);

const CodeSnippetSchema = new Schema(
  {
    language: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const TestCaseSchema = new Schema(
  {
    args: {
      type: [Schema.Types.Mixed],
      required: true,
      validate: [
        (arr) => Array.isArray(arr),
        "Test case 'args' must be an array (of JSON-serializable values).",
      ],
    },
    expected: {
      type: Schema.Types.Mixed,
      required: true,
    },
    hidden: { type: Boolean, default: false },
  },
  { _id: false }
);

const QuestionsModelSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  difficulty: {
    type: String,
    required: true,
    enum: ["Easy", "Medium", "Hard"],
  },
  topics: {
    type: [
      {
        type: String,
        enum: [
          "Strings",
          "Arrays",
          "Linked List",
          "Heaps",
          "Hashmap",
          "Trees",
          "Graphs",
          "Dynamic Programming",
        ],
      },
    ],
    required: true,
    validate: [
      (val) => val.length > 0,
      "A question must have at least one topic.",
    ],
  },
  problemStatement: {
    type: String,
    required: true,
  },
  constraints: {
    type: [String],
    required: true,
  },
  examples: {
    type: [ExampleSchema],
    required: true,
    validate: [
      (val) => val.length > 0,
      "A question must have at least one example.",
    ],
  },
  codeSnippets: {
    type: [CodeSnippetSchema],
    required: false,
  },
  entryPoint: { type: String, required: true },
  signature: { type: SignatureSchema, default: undefined },

  testCases: {
    type: [TestCaseSchema],
    required: true,
    validate: [
      (val) => val.length > 0,
      "A question must have at least one test case.",
    ],
  },
});

export default mongoose.model("QuestionModel", QuestionsModelSchema);

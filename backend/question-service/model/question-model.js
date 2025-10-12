import mongoose from "mongoose";

const Schema = mongoose.Schema;

// Sub-schema for examples
const ExampleSchema = new Schema(
  {
    input: {
      type: String,
      required: true,
    },
    output: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      required: false, // Optional
    },
    image: {
      type: String,
      required: false, // Optional
    },
  },
  { _id: false }
); // Prevents Mongoose from creating an _id for subdocuments

// Sub-schema for code snippets
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
); // Prevents Mongoose from creating an _id for subdocuments

// Sub-schema for test cases
const TestCaseSchema = new Schema(
  {
    input: {
      type: String,
      required: true,
    },
    expected: {
      type: String,
      required: true,
    },
  },
  { _id: false }
); // Prevents Mongoose from creating an _id for subdocuments

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
    // Custom validator to ensure the array has at least one item
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
    required: false, // Optional field
  },
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

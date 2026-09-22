"use strict";

const CATALOG_URL = "./catalog.json";

const appState = {
    catalog: null,
    activeQuiz: null,
    currentQuestionIndex: 0,
    score: 0,
    answered: false
};

const appElement = document.querySelector("#app");
const searchInput =
    document.querySelector("#reviewer-search");

const viewReviewersButton =
    document.querySelector("#view-reviewers-button");

const themeButton =
    document.querySelector("#theme-button");

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
    showStatus("Loading reviewers...");

    try {
        const catalog = await fetchJson(CATALOG_URL);
        validateCatalog(catalog);

        appState.catalog = catalog;
        renderCatalog(catalog);
    } catch (error) {
        console.error(error);

        renderError(
            "The reviewers could not be loaded.",
            error.message
        );
    }
}

async function fetchJson(url) {
    const response = await fetch(url, {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(
            `Request failed with status ${response.status}.`
        );
    }

    try {
        return await response.json();
    } catch {
        throw new Error("The downloaded file is not valid JSON.");
    }
}

function validateCatalog(catalog) {
    if (!catalog || typeof catalog !== "object") {
        throw new Error("The quiz catalog is missing.");
    }

    if (!Array.isArray(catalog.quizzes)) {
        throw new Error(
            "The quiz catalog does not contain a quizzes array."
        );
    }

    for (const quiz of catalog.quizzes) {
        if (
            typeof quiz.id !== "string" ||
            typeof quiz.title !== "string" ||
            typeof quiz.file !== "string"
        ) {
            throw new Error(
                "One or more catalog entries are invalid."
            );
        }
    }
}

function validateQuiz(quiz) {
    if (!quiz || typeof quiz !== "object") {
        throw new Error("The quiz file is missing.");
    }

    if (
        typeof quiz.id !== "string" ||
        typeof quiz.title !== "string"
    ) {
        throw new Error("The quiz metadata is invalid.");
    }

    if (
        !Array.isArray(quiz.questions) ||
        quiz.questions.length === 0
    ) {
        throw new Error(
            "The quiz does not contain any questions."
        );
    }

    for (const question of quiz.questions) {
        validateQuestion(question);
    }
}

function validateQuestion(question) {
    if (
        !question ||
        typeof question.id !== "string" ||
        question.type !== "multiple_choice" ||
        typeof question.prompt !== "string"
    ) {
        throw new Error(
            "The quiz contains an invalid question."
        );
    }

    if (
        !Array.isArray(question.choices) ||
        question.choices.length < 2
    ) {
        throw new Error(
            `Question ${question.id} does not have enough choices.`
        );
    }

    const validChoices = question.choices.every(
        choice => typeof choice === "string"
    );

    if (!validChoices) {
        throw new Error(
            `Question ${question.id} contains an invalid choice.`
        );
    }

    if (
        !Number.isInteger(question.correctChoiceIndex) ||
        question.correctChoiceIndex < 0 ||
        question.correctChoiceIndex >= question.choices.length
    ) {
        throw new Error(
            `Question ${question.id} has an invalid answer index.`
        );
    }
}

function renderCatalog(catalog) {
    clearApp();

    const section = document.createElement("section");

    const list = document.createElement("div");
    list.className = "quiz-list";


    if (catalog.quizzes.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "status-card";
        emptyState.textContent =
            "No reviewers are available yet.";

        section.append(emptyState);
        appElement.append(section);
        return;
    }

    for (const quiz of catalog.quizzes) {
        list.append(createQuizCard(quiz));
    }

    section.append(list);
    appElement.append(section);
}

function createQuizCard(quiz) {
    const article = document.createElement("article");
    article.className = "quiz-card";

    const title = document.createElement("h3");
    title.textContent = quiz.title;

    const subject = document.createElement("p");
    subject.className = "quiz-subject";
    subject.textContent = quiz.subject || "General";

    const description = document.createElement("p");
    description.className = "quiz-description";
    description.textContent =
        quiz.description || "No description available.";

    const button = document.createElement("button");
    button.className = "primary-button";
    button.type = "button";
    button.textContent = "Start reviewer";

    button.addEventListener("click", () => {
        loadQuiz(quiz);
    });

    article.append(title, subject, description, button);

    return article;
}

async function loadQuiz(catalogEntry) {
    showStatus(`Loading ${catalogEntry.title}...`);

    try {
        const quiz = await fetchJson(catalogEntry.file);
        validateQuiz(quiz);

        appState.activeQuiz = quiz;
        appState.currentQuestionIndex = 0;
        appState.score = 0;
        appState.answered = false;

        renderQuestion();
    } catch (error) {
        console.error(error);

        renderError(
            "The selected quiz could not be loaded.",
            error.message
        );
    }
}

function renderQuestion() {
    const quiz = appState.activeQuiz;
    const index = appState.currentQuestionIndex;
    const question = quiz.questions[index];

    clearApp();

    const toolbar = document.createElement("div");
    toolbar.className = "quiz-toolbar";

    const backButton = document.createElement("button");
    backButton.className = "secondary-button";
    backButton.type = "button";
    backButton.textContent = "Back to Reviewers";
    backButton.addEventListener("click", () => {
        renderCatalog(appState.catalog);
    });

    toolbar.append(backButton);

    const article = document.createElement("article");
    article.className = "question-card";

    const progress = document.createElement("p");
    progress.className = "question-progress";
    progress.textContent =
        `Question ${index + 1} of ${quiz.questions.length}`;

    const prompt = document.createElement("h2");
    prompt.className = "question-prompt";
    prompt.textContent = question.prompt;

    const choices = document.createElement("div");
    choices.className = "choice-list";

    question.choices.forEach((choice, choiceIndex) => {
        const button = document.createElement("button");

        button.className = "choice-button";
        button.type = "button";
        button.textContent = choice;

        button.addEventListener("click", () => {
            answerQuestion(choiceIndex, choices, article);
        });

        choices.append(button);
    });

    article.append(progress, prompt, choices);
    appElement.append(toolbar, article);
}

function answerQuestion(
    selectedIndex,
    choicesElement,
    questionCard
) {
    if (appState.answered) {
        return;
    }

    appState.answered = true;

    const question =
        appState.activeQuiz.questions[
            appState.currentQuestionIndex
            ];

    const isCorrect =
        selectedIndex === question.correctChoiceIndex;

    if (isCorrect) {
        appState.score += 1;
    }

    const choiceButtons =
        choicesElement.querySelectorAll(".choice-button");

    choiceButtons.forEach((button, index) => {
        button.disabled = true;

        if (index === question.correctChoiceIndex) {
            button.classList.add("correct");
        }

        if (
            index === selectedIndex &&
            index !== question.correctChoiceIndex
        ) {
            button.classList.add("incorrect");
        }
    });

    const feedback = document.createElement("div");
    feedback.className =
        `feedback ${isCorrect ? "correct" : "incorrect"}`;

    const feedbackHeading = document.createElement("strong");
    feedbackHeading.textContent =
        isCorrect ? "Correct" : "Not quite";

    const explanation = document.createElement("p");
    explanation.textContent =
        question.explanation ||
        "No explanation is available for this question.";

    feedback.append(feedbackHeading, explanation);

    if (question.source?.page) {
        const source = document.createElement("p");
        source.textContent = `Source page: ${question.source.page}`;
        feedback.append(source);
    }

    const nextButton = document.createElement("button");
    nextButton.className = "primary-button next-button";
    nextButton.type = "button";

    const isLastQuestion =
        appState.currentQuestionIndex ===
        appState.activeQuiz.questions.length - 1;

    nextButton.textContent =
        isLastQuestion ? "View Results" : "Next Question";

    nextButton.addEventListener("click", () => {
        if (isLastQuestion) {
            renderResults();
            return;
        }

        appState.currentQuestionIndex += 1;
        appState.answered = false;
        renderQuestion();
    });

    questionCard.append(feedback, nextButton);
}

function renderResults() {
    clearApp();

    const total = appState.activeQuiz.questions.length;
    const percentage = Math.round(
        (appState.score / total) * 100
    );

    const article = document.createElement("article");
    article.className = "results-card";

    const heading = document.createElement("h2");
    heading.className = "page-heading";
    heading.textContent = "Quiz Complete";

    const score = document.createElement("p");
    score.className = "results-score";
    score.textContent =
        `${appState.score} / ${total} (${percentage}%)`;

    const message = document.createElement("p");
    message.textContent = createResultMessage(percentage);

    const retryButton = document.createElement("button");
    retryButton.className = "primary-button";
    retryButton.type = "button";
    retryButton.textContent = "Try Again";

    retryButton.addEventListener("click", () => {
        appState.currentQuestionIndex = 0;
        appState.score = 0;
        appState.answered = false;
        renderQuestion();
    });

    const catalogButton = document.createElement("button");
    catalogButton.className =
        "secondary-button next-button";
    catalogButton.type = "button";
    catalogButton.textContent = "Back to Reviewers";

    catalogButton.addEventListener("click", () => {
        renderCatalog(appState.catalog);
    });

    article.append(
        heading,
        score,
        message,
        retryButton,
        catalogButton
    );

    appElement.append(article);
}

function createResultMessage(percentage) {
    if (percentage === 100) {
        return "Perfect score.";
    }

    if (percentage >= 80) {
        return "Strong result. Review the explanations and try again.";
    }

    if (percentage >= 60) {
        return "Good attempt. Another review should strengthen recall.";
    }

    return "Review the topic and try the quiz again.";
}

function showStatus(message) {
    clearApp();

    const status = document.createElement("section");
    status.className = "status-card";
    status.setAttribute("aria-live", "polite");
    status.textContent = message;

    appElement.append(status);
}

function renderError(title, details) {
    clearApp();

    const section = document.createElement("section");
    section.className = "error-card";
    section.setAttribute("role", "alert");

    const heading = document.createElement("h2");
    heading.textContent = title;

    const message = document.createElement("p");
    message.textContent = details;

    const retryButton = document.createElement("button");
    retryButton.className = "secondary-button";
    retryButton.type = "button";
    retryButton.textContent = "Try Again";

    retryButton.addEventListener("click", initializeApp);

    section.append(heading, message, retryButton);
    appElement.append(section);
}

function clearApp() {
    appElement.replaceChildren();
}

if (viewReviewersButton) {
    viewReviewersButton.addEventListener(
        "click",
        () => {
            document
                .querySelector("#reviewers-section")
                .scrollIntoView({
                    behavior: "smooth"
                });
        }
    );
}

if (themeButton) {
    themeButton.addEventListener(
        "click",
        () => {
            document.body.classList.toggle("dark");

            const darkModeEnabled =
                document.body.classList.contains("dark");

            themeButton.textContent =
                darkModeEnabled
                    ? "Light"
                    : "Dark";

            themeButton.setAttribute(
                "aria-label",
                darkModeEnabled
                    ? "Enable light mode"
                    : "Enable dark mode"
            );
        }
    );
}

if (searchInput) {
    searchInput.addEventListener(
        "input",
        () => {
            if (!appState.catalog) {
                return;
            }

            const searchTerm =
                searchInput.value
                    .trim()
                    .toLowerCase();

            const filteredCatalog = {
                ...appState.catalog,

                quizzes:
                    appState.catalog.quizzes.filter(
                        quiz => {
                            const searchableText = [
                                quiz.title,
                                quiz.subject,
                                quiz.description
                            ]
                                .filter(Boolean)
                                .join(" ")
                                .toLowerCase();

                            return searchableText.includes(
                                searchTerm
                            );
                        }
                    )
            };

            renderCatalog(filteredCatalog);
        }
    );
}

// Dashboard controls
const uploadSheet = document.querySelector("#uploadSheet");
const uploadButton = document.querySelector("#uploadButton");
const closeSheetButton = document.querySelector("#closeSheet");
const fileInput = document.querySelector("#fileInput");
const selectedFile = document.querySelector("#selectedFile");
const toast = document.querySelector("#toast");
let toastTimer;

function showToast(message) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function openUpload(source = "notes") {
    if (!uploadSheet) return;
    const title = document.querySelector("#uploadTitle");
    if (title) title.textContent = `Add ${source.toLowerCase()}`;
    uploadSheet.classList.add("open");
    uploadSheet.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeUpload() {
    if (!uploadSheet) return;
    uploadSheet.classList.remove("open");
    uploadSheet.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

uploadButton?.addEventListener("click", () => openUpload("notes"));
closeSheetButton?.addEventListener("click", closeUpload);
uploadSheet?.addEventListener("click", event => {
    if (event.target === uploadSheet) closeUpload();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeUpload();
});
document.querySelectorAll(".source-button").forEach(button => {
    button.addEventListener("click", () => {
        const source = button.dataset.source;
        if (source === "PDF" || source === "PowerPoint") openUpload(source);
        else showToast(`${source} support is planned for a later phase.`);
    });
});
fileInput?.addEventListener("change", () => {
    selectedFile.textContent = fileInput.files[0]
        ? `${fileInput.files[0].name} selected`
        : "No file selected";
});
document.querySelector("#askButton")?.addEventListener("click", () =>
    showToast("Ask Jean is reserved for a later phase."));
document.querySelector("#seeAllButton")?.addEventListener("click", () =>
    showToast("All available reviewers are already shown."));

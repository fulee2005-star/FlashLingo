import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  RotateCcw,
  Languages,
  GraduationCap,
  Save,
  ArrowRight,
  Shuffle,
} from "lucide-react";

// --- FIREBASE CONFIGURATION & INITIALIZATION ---

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "FlagLingo"; // Đặt tên tĩnh
// --- MAIN COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [vocabList, setVocabList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Views: 'dashboard', 'manage', 'learn', 'test_vi_en', 'test_en_vi'
  const [currentView, setCurrentView] = useState("dashboard");

  // State for CRUD
  const [isEditing, setIsEditing] = useState(null); // ID of item being edited
  const [editForm, setEditForm] = useState({ en: "", vi: "", topic: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("all"); // For filtering

  // --- AUTHENTICATION ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // --- FIRESTORE REAL-TIME DATA ---
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "artifacts", appId, "users", user.uid, "vocab"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
          ); // Sort newest first locally
        setVocabList(items);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // --- CRUD OPERATIONS ---
  const handleAddVocab = async (e) => {
    e.preventDefault();
    if (!editForm.en.trim() || !editForm.vi.trim()) return;

    try {
      await addDoc(
        collection(db, "artifacts", appId, "users", user.uid, "vocab"),
        {
          en: editForm.en.trim(),
          vi: editForm.vi.trim(),
          topic: editForm.topic.trim() || "Chưa phân loại",
          createdAt: serverTimestamp(),
          mastered: false,
        },
      );
      setEditForm({ en: "", vi: "", topic: "" });
      setShowAddModal(false);
    } catch (err) {
      console.error("Error adding:", err);
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Bạn có chắc muốn xóa từ này không?")) {
      try {
        await deleteDoc(
          doc(db, "artifacts", appId, "users", user.uid, "vocab", id),
        );
      } catch (err) {
        console.error("Error deleting:", err);
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editForm.en.trim() || !editForm.vi.trim()) return;

    try {
      await updateDoc(
        doc(db, "artifacts", appId, "users", user.uid, "vocab", isEditing),
        {
          en: editForm.en.trim(),
          vi: editForm.vi.trim(),
          topic: editForm.topic.trim() || "Chưa phân loại",
        },
      );
      setIsEditing(null);
      setEditForm({ en: "", vi: "", topic: "" });
    } catch (err) {
      console.error("Error updating:", err);
    }
  };

  const startEdit = (item) => {
    setIsEditing(item.id);
    setEditForm({ en: item.en, vi: item.vi, topic: item.topic || "" });
    setShowAddModal(true);
  };

  // Get unique topics from vocab list
  const topics = useMemo(() => {
    const topicSet = new Set(
      vocabList.map((item) => item.topic || "Chưa phân loại"),
    );
    return Array.from(topicSet).sort();
  }, [vocabList]);

  // --- RENDER HELPERS ---
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div
              className="flex items-center cursor-pointer"
              onClick={() => setCurrentView("dashboard")}
            >
              <GraduationCap className="h-8 w-8 text-indigo-600 mr-2" />
              <span className="font-bold text-xl text-slate-800 tracking-tight">
                FlashLingo
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView("manage")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === "manage"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:text-indigo-600"
                }`}
              >
                Quản lý từ
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "dashboard" && (
          <Dashboard vocabList={vocabList} onChangeView={setCurrentView} />
        )}

        {currentView === "manage" && (
          <ManageVocab
            vocabList={vocabList}
            onDelete={handleDelete}
            onEdit={startEdit}
            isEditing={isEditing}
            editForm={editForm}
            setEditForm={setEditForm}
            handleUpdate={handleUpdate}
            handleAdd={handleAddVocab}
            showModal={showAddModal}
            setShowModal={setShowAddModal}
            setIsEditing={setIsEditing}
          />
        )}

        {currentView === "learn" && (
          <LearnMode
            vocabList={vocabList}
            topics={topics}
            onBack={() => setCurrentView("dashboard")}
          />
        )}

        {(currentView === "test_vi_en" || currentView === "test_en_vi") && (
          <TestMode
            vocabList={vocabList}
            topics={topics}
            mode={currentView}
            onBack={() => setCurrentView("dashboard")}
          />
        )}
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function Dashboard({ vocabList, onChangeView }) {
  const stats = useMemo(() => {
    return {
      total: vocabList.length,
      mastered: vocabList.filter((v) => v.mastered).length,
    };
  }, [vocabList]);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">
          Chào mừng bạn trở lại!
        </h1>
        <p className="text-slate-500">
          Bạn đang có{" "}
          <span className="font-bold text-indigo-600">{stats.total}</span> từ
          vựng trong kho lưu trữ.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Learn Card */}
        <div
          onClick={() => onChangeView("learn")}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Học từ mới</h3>
          <p className="text-slate-500 text-sm">
            Xem lại các thẻ từ (Flashcards), ghi nhớ nghĩa và cách viết.
          </p>
        </div>

        {/* Test Vi -> En */}
        <div
          onClick={() => onChangeView("test_vi_en")}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Languages className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Kiểm tra: Việt - Anh</h3>
          <p className="text-slate-500 text-sm">
            Nhìn tiếng Việt, gõ tiếng Anh. Rèn luyện khả năng nhớ từ.
          </p>
        </div>

        {/* Test En -> Vi */}
        <div
          onClick={() => onChangeView("test_en_vi")}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <RotateCcw className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Kiểm tra: Anh - Việt</h3>
          <p className="text-slate-500 text-sm">
            Nhìn tiếng Anh, gõ nghĩa tiếng Việt. Kiểm tra độ hiểu nghĩa.
          </p>
        </div>
      </div>

      {vocabList.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-center">
          Bạn chưa có từ vựng nào. Hãy vào mục <strong>"Quản lý từ"</strong> để
          thêm từ mới nhé!
        </div>
      )}
    </div>
  );
}

function ManageVocab({
  vocabList,
  onDelete,
  onEdit,
  isEditing,
  editForm,
  setEditForm,
  handleUpdate,
  handleAdd,
  showModal,
  setShowModal,
  setIsEditing,
}) {
  const openAddModal = () => {
    setIsEditing(null);
    setEditForm({ en: "", vi: "", topic: "" });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Danh sách từ vựng</h2>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Thêm từ mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {vocabList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Chưa có dữ liệu. Hãy thêm từ vựng đầu tiên!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {vocabList.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="font-semibold text-indigo-900">
                      {item.en}
                    </div>
                    <div className="text-slate-600">{item.vi}</div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => onEdit(item)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {item.topic && (
                  <div className="mt-2">
                    <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                      {item.topic}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4">
              {isEditing ? "Chỉnh sửa từ" : "Thêm từ mới"}
            </h3>
            <form
              onSubmit={isEditing ? handleUpdate : handleAdd}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tiếng Anh
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Apple"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={editForm.en}
                  onChange={(e) =>
                    setEditForm({ ...editForm, en: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tiếng Việt
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Quả táo"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={editForm.vi}
                  onChange={(e) =>
                    setEditForm({ ...editForm, vi: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Chủ đề (Topic)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trái cây, Động vật, Nghề nghiệp..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={editForm.topic}
                  onChange={(e) =>
                    setEditForm({ ...editForm, topic: e.target.value })
                  }
                />
                <p className="text-xs text-slate-500 mt-1">
                  Để trống sẽ tự động đặt là "Chưa phân loại"
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium shadow-sm transition-colors flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Lưu thay đổi" : "Thêm từ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function LearnMode({ vocabList, topics, onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("all");

  // Filter vocab by selected topic
  const filteredVocab =
    selectedTopic === "all"
      ? vocabList
      : vocabList.filter(
          (item) => (item.topic || "Chưa phân loại") === selectedTopic,
        );

  if (vocabList.length === 0) {
    return (
      <EmptyState message="Cần có ít nhất 1 từ vựng để học." onBack={onBack} />
    );
  }

  if (filteredVocab.length === 0) {
    return (
      <div className="text-center space-y-4">
        <p className="text-slate-500">Không có từ vựng nào trong chủ đề này.</p>
        <button
          onClick={() => setSelectedTopic("all")}
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Xem tất cả
        </button>
      </div>
    );
  }

  const currentCard = filteredVocab[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % filteredVocab.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex(
      (prev) => (prev - 1 + filteredVocab.length) % filteredVocab.length,
    );
  };

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto">
      <div className="w-full flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-800 font-medium"
        >
          &larr; Quay lại
        </button>
        <div className="text-slate-500 font-medium">
          Thẻ {currentIndex + 1} / {filteredVocab.length}
        </div>
      </div>

      {/* Topic Selector */}
      <div className="w-full mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Chọn chủ đề
        </label>
        <select
          value={selectedTopic}
          onChange={(e) => {
            setSelectedTopic(e.target.value);
            setCurrentIndex(0);
            setIsFlipped(false);
          }}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
        >
          <option value="all">Tất cả chủ đề ({vocabList.length} từ)</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic} (
              {
                vocabList.filter((v) => (v.topic || "Chưa phân loại") === topic)
                  .length
              }{" "}
              từ)
            </option>
          ))}
        </select>
      </div>

      <div
        className="w-full aspect-[3/2] perspective-1000 cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-white rounded-3xl shadow-lg border border-slate-200 flex flex-col items-center justify-center p-8">
            <span className="text-sm uppercase tracking-wider text-slate-400 font-semibold mb-4">
              Tiếng Anh
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 text-center break-words">
              {currentCard.en}
            </h2>
            <p className="mt-8 text-slate-400 text-sm animate-pulse">
              Chạm để lật
            </p>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-indigo-600 rounded-3xl shadow-lg flex flex-col items-center justify-center p-8">
            <span className="text-sm uppercase tracking-wider text-indigo-200 font-semibold mb-4">
              Nghĩa Tiếng Việt
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white text-center break-words">
              {currentCard.vi}
            </h2>
          </div>
        </div>
      </div>

      <div className="flex justify-between w-full mt-8 px-4">
        <button
          onClick={handlePrev}
          className="px-6 py-3 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          Trước
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-md font-medium hover:bg-indigo-700 transition-colors flex items-center"
        >
          Tiếp theo <ArrowRight className="h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );
}

function TestMode({ vocabList, topics, mode, onBack }) {
  // Shuffle list on init
  const [testQueue, setTestQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect', null
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [showTopicSelector, setShowTopicSelector] = useState(true);

  // Filter vocab by selected topic
  const filteredVocab =
    selectedTopic === "all"
      ? vocabList
      : vocabList.filter(
          (item) => (item.topic || "Chưa phân loại") === selectedTopic,
        );

  useEffect(() => {
    if (!showTopicSelector && filteredVocab.length > 0) {
      // Simple shuffle
      const shuffled = [...filteredVocab].sort(() => 0.5 - Math.random());
      setTestQueue(shuffled);
      setCurrentIndex(0);
      setScore(0);
      setIsFinished(false);
    }
  }, [showTopicSelector, selectedTopic]);

  if (vocabList.length === 0) {
    return (
      <EmptyState
        message="Cần có ít nhất 1 từ vựng để kiểm tra."
        onBack={onBack}
      />
    );
  }

  // Show topic selector screen
  if (showTopicSelector) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-800 font-medium mb-6"
        >
          &larr; Quay lại
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">
            Chọn chủ đề để kiểm tra
          </h2>

          <div className="space-y-3">
            <button
              onClick={() => {
                setSelectedTopic("all");
                setShowTopicSelector(false);
              }}
              className="w-full text-left px-6 py-4 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 rounded-xl transition-all"
            >
              <div className="font-semibold text-indigo-900">Tất cả chủ đề</div>
              <div className="text-sm text-indigo-600">
                {vocabList.length} từ vựng
              </div>
            </button>

            {topics.map((topic) => {
              const count = vocabList.filter(
                (v) => (v.topic || "Chưa phân loại") === topic,
              ).length;
              return (
                <button
                  key={topic}
                  onClick={() => {
                    setSelectedTopic(topic);
                    setShowTopicSelector(false);
                  }}
                  className="w-full text-left px-6 py-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-indigo-300 rounded-xl transition-all"
                >
                  <div className="font-semibold text-slate-800">{topic}</div>
                  <div className="text-sm text-slate-500">{count} từ vựng</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (testQueue.length === 0) return null;

  const currentQuestion = testQueue[currentIndex];
  // mode 'test_vi_en': Show Vi, User types En
  // mode 'test_en_vi': Show En, User types Vi

  const questionText =
    mode === "test_vi_en" ? currentQuestion.vi : currentQuestion.en;
  const answerKey =
    mode === "test_vi_en" ? currentQuestion.en : currentQuestion.vi;
  const questionLabel = mode === "test_vi_en" ? "Tiếng Việt" : "Tiếng Anh";
  const answerLabel = mode === "test_vi_en" ? "Tiếng Anh" : "Tiếng Việt";

  const checkAnswer = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const normalize = (str) => str.toLowerCase().trim();
    const isCorrect = normalize(userInput) === normalize(answerKey);

    if (isCorrect) {
      setFeedback("correct");
      setScore((s) => s + 1);
    } else {
      setFeedback("incorrect");
    }
  };

  const nextQuestion = () => {
    setFeedback(null);
    setUserInput("");
    if (currentIndex < testQueue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
          <GraduationCap className="h-10 w-10 text-yellow-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">
          Hoàn thành bài kiểm tra!
        </h2>
        <p className="text-slate-500 mb-8 text-lg">
          Bạn đã trả lời đúng{" "}
          <span className="font-bold text-indigo-600 text-2xl">
            {score}/{testQueue.length}
          </span>{" "}
          câu.
        </p>
        <button
          onClick={onBack}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
        >
          Quay lại màn hình chính
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-800 font-medium"
        >
          &larr; Thoát
        </button>
        <div className="text-sm font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          Câu {currentIndex + 1} / {testQueue.length}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="p-8 pb-4">
          <div className="text-center mb-8">
            <p className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
              {questionLabel}
            </p>
            <h2 className="text-3xl font-bold text-slate-800">
              {questionText}
            </h2>
          </div>

          <form onSubmit={checkAnswer}>
            <div className="relative">
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2 ml-1">
                Nhập {answerLabel}
              </label>
              <input
                type="text"
                autoFocus
                disabled={feedback !== null}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className={`w-full px-4 py-4 text-lg rounded-xl border-2 outline-none transition-colors ${
                  feedback === "correct"
                    ? "border-green-500 bg-green-50 text-green-800"
                    : feedback === "incorrect"
                      ? "border-red-500 bg-red-50 text-red-800"
                      : "border-slate-200 focus:border-indigo-500"
                }`}
                placeholder="Gõ câu trả lời của bạn..."
              />
              {feedback === "correct" && (
                <CheckCircle className="absolute right-4 top-10 text-green-500 h-6 w-6 animate-in zoom-in" />
              )}
              {feedback === "incorrect" && (
                <XCircle className="absolute right-4 top-10 text-red-500 h-6 w-6 animate-in zoom-in" />
              )}
            </div>

            {feedback === "incorrect" && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100 animate-in slide-in-from-top-2">
                <p className="text-sm text-red-600 font-medium">
                  Đáp án đúng là:
                </p>
                <p className="text-lg font-bold text-red-800">{answerKey}</p>
              </div>
            )}

            <div className="mt-8">
              {!feedback ? (
                <button
                  type="submit"
                  disabled={!userInput.trim()}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Kiểm tra
                </button>
              ) : (
                <button
                  type="button"
                  autoFocus
                  onClick={nextQuestion}
                  className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-all ${
                    feedback === "correct"
                      ? "bg-green-600 hover:bg-green-700 shadow-green-200"
                      : "bg-slate-800 hover:bg-slate-900 shadow-slate-300"
                  }`}
                >
                  {currentIndex < testQueue.length - 1
                    ? "Câu tiếp theo"
                    : "Xem kết quả"}
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="h-2 bg-slate-100">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{
              width: `${
                ((currentIndex + (feedback ? 1 : 0)) / testQueue.length) * 100
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message, onBack }) {
  return (
    <div className="text-center py-12">
      <div className="inline-block p-4 rounded-full bg-slate-100 mb-4">
        <BookOpen className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-1">
        Chưa có dữ liệu
      </h3>
      <p className="text-slate-500 mb-6">{message}</p>
      <button
        onClick={onBack}
        className="text-indigo-600 font-medium hover:text-indigo-800"
      >
        Quay lại trang chủ
      </button>
    </div>
  );
}

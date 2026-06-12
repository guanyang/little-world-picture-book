import { useMemo, useRef, useState } from "react";
import {
  CaretLeft,
  CaretRight,
  Carrot,
  FlowerTulip,
  Leaf,
  PawPrint,
  Play,
  SpeakerHigh,
  UsersThree,
} from "@phosphor-icons/react";
import { bookCategories } from "./content/bookData.js";

const iconMap = {
  animals: PawPrint,
  plants: FlowerTulip,
  vegetables: Carrot,
  fruits: Leaf,
};

const categories = bookCategories.map((category) => ({
  ...category,
  icon: iconMap[category.id] || Leaf,
}));

export function App() {
  const [categoryIndex, setCategoryIndex] = useState(2);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const dragStartX = useRef(null);

  const category = categories[categoryIndex];
  const selectedItem = category.items[selectedIndex] || category.items[0];
  const progress = useMemo(
    () => `${categoryIndex + 1} / ${categories.length}`,
    [categoryIndex],
  );
  const itemProgress = `${selectedIndex + 1} / ${category.items.length}`;

  const selectCategory = (index) => {
    setCategoryIndex(index);
    setSelectedIndex(0);
    setIsSpeaking(false);
  };

  const turnPage = (direction) => {
    const nextIndex =
      (categoryIndex + direction + categories.length) % categories.length;
    selectCategory(nextIndex);
  };

  const turnItem = (direction) => {
    const nextIndex =
      (selectedIndex + direction + category.items.length) % category.items.length;
    setSelectedIndex(nextIndex);
    setIsSpeaking(false);
  };

  const handleFocusPointerDown = (event) => {
    if (event.target.closest("button")) {
      return;
    }

    dragStartX.current = event.clientX;
  };

  const handleFocusPointerUp = (event) => {
    if (dragStartX.current === null) {
      return;
    }

    const dragDistance = event.clientX - dragStartX.current;
    dragStartX.current = null;

    if (Math.abs(dragDistance) < 48) {
      return;
    }

    turnItem(dragDistance < 0 ? 1 : -1);
  };

  const speak = () => {
    setIsSpeaking(true);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `${selectedItem.name}。${selectedItem.cue}。跟我读：${selectedItem.name}`,
      );
      utterance.lang = "zh-CN";
      utterance.rate = 0.82;
      utterance.pitch = 1.08;
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      return;
    }

    window.setTimeout(() => setIsSpeaking(false), 1200);
  };

  return (
    <main className="prototype-shell">
      <section className={`book-stage theme-${category.theme}`}>
        <button
          className="page-arrow page-arrow-left"
          type="button"
          aria-label="上一页"
          onClick={() => turnPage(-1)}
        >
          <CaretLeft size={30} weight="bold" />
        </button>

        <div className="book" aria-live="polite">
          <section className="book-page left-page">
            <div className="image-wrap">
              <img src={category.image} alt={`${category.label}绘本插画`} />
              <div className="title-panel">
                <p>观察 · 翻页 · 说一说</p>
                <h1>{category.title}</h1>
                <span>{category.subtitle}</span>
              </div>
              <div className="field-note">
                <span>小任务</span>
                翻一翻，听一听，说出它的名字。
              </div>
            </div>
          </section>

          <section className="book-page right-page">
            <div className="selection-badge">
              <Leaf size={18} weight="fill" />
              我选中的{category.label}
            </div>

            <article
              className="focus-card"
              onPointerDown={handleFocusPointerDown}
              onPointerUp={handleFocusPointerUp}
            >
              <div className="focus-image">
                <div className="focus-plate">
                  <img
                    src={selectedItem.image || category.image}
                    alt={selectedItem.name}
                    style={{
                      "--focus-scale": selectedItem.focusScale || 1.42,
                      objectPosition: selectedItem.focusPosition || "center",
                    }}
                  />
                </div>
                <button
                  className={`audio-pin ${isSpeaking ? "speaking" : ""}`}
                  type="button"
                  aria-label={`播放${selectedItem.name}发音`}
                  onClick={speak}
                >
                  <SpeakerHigh size={24} weight="fill" />
                </button>
              </div>
              <div className="focus-copy">
                <h2>{selectedItem.name}</h2>
                <p className="pinyin">{selectedItem.pinyin}</p>
                <p>{selectedItem.cue}</p>
                <dl>
                  <div>
                    <dt>颜色</dt>
                    <dd>{selectedItem.color}</dd>
                  </div>
                  <div>
                    <dt>形状</dt>
                    <dd>{selectedItem.shape}</dd>
                  </div>
                </dl>
                <div className="item-controls" aria-label={`${category.label}切换`}>
                  <button type="button" onClick={() => turnItem(-1)}>
                    <CaretLeft size={19} weight="bold" />
                    上个
                  </button>
                  <span>{itemProgress}</span>
                  <button type="button" onClick={() => turnItem(1)}>
                    下个
                    <CaretRight size={19} weight="bold" />
                  </button>
                </div>
              </div>
            </article>

            <section className="more-items" aria-label={`更多${category.label}`}>
              <h3>滑动或切换认识更多{category.label}</h3>
              <div className="item-grid">
                {category.items.map((item, index) => (
                  <button
                    className={`item-card ${selectedIndex === index ? "selected" : ""}`}
                    type="button"
                    key={item.name}
                    onClick={() => setSelectedIndex(index)}
                  >
                    <span className="item-number">{index + 1}</span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.color} · {item.shape}
                    </small>
                  </button>
                ))}
              </div>
            </section>

            <section className="question-card">
              <UsersThree size={28} weight="fill" />
              <div>
                <h3>亲子小问答</h3>
                <p>问：{category.question}</p>
                <p>答：{selectedItem.cue}。和爸爸妈妈说一说吧！</p>
              </div>
            </section>
          </section>
        </div>

        <nav className="category-tabs" aria-label="绘本分类">
          {categories.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                className={category.id === item.id ? "selected" : ""}
                type="button"
                key={item.id}
                onClick={() => selectCategory(index)}
              >
                <Icon size={23} weight="fill" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="reading-bar">
          <button type="button" onClick={() => turnPage(-1)}>
            <CaretLeft size={22} weight="bold" />
            上一页
          </button>
          <div className="read-state">
            <button
              className={isSpeaking ? "active" : ""}
              type="button"
              onClick={speak}
            >
              <Play size={18} weight="fill" />
              跟读
            </button>
            <span>{progress}</span>
          </div>
          <button type="button" onClick={() => turnPage(1)}>
            下一页
            <CaretRight size={22} weight="bold" />
          </button>
        </div>

        <button
          className="page-arrow page-arrow-right"
          type="button"
          aria-label="下一页"
          onClick={() => turnPage(1)}
        >
          <CaretRight size={30} weight="bold" />
        </button>
      </section>
    </main>
  );
}

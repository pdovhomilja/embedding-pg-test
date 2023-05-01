import { FC, useEffect, useState } from "react";
import styles from "./answer.module.css";

interface Props {
  text: string;
}

export const Answer: FC<Props> = ({ text }) => {
  const [words, setWords] = useState<string[]>([]);

  useEffect(() => {
    setWords(text.split(" "));
  }, [text]);

  return (
    <div>
      {words.map((word, i) => (
        <span
          key={i}
          className={styles.fadeIn}
          style={{
            animationDelay: `${i * 0.1}s`,
          }}
        >
          {word}{" "}
        </span>
      ))}
    </div>
  );
};

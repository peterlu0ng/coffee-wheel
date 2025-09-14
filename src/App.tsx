import { useState, useEffect } from "react";
import "./App.css";

interface Person {
  id: string;
  name: string;
  wins: number;
}

function App() {
  const [names, setNames] = useState<Person[]>([]);
  const [newName, setNewName] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  // Load names from localStorage on component mount
  useEffect(() => {
    const savedNames = localStorage.getItem("coffee-wheel-names");
    if (savedNames) {
      setNames(JSON.parse(savedNames));
    }
  }, []);

  // Save names to localStorage whenever names change
  useEffect(() => {
    localStorage.setItem("coffee-wheel-names", JSON.stringify(names));
  }, [names]);

  const addName = () => {
    if (
      newName.trim() &&
      !names.some(
        (person) => person.name.toLowerCase() === newName.toLowerCase()
      )
    ) {
      const newPerson: Person = {
        id: Date.now().toString(),
        name: newName.trim(),
        wins: 0,
      };
      setNames([...names, newPerson]);
      setNewName("");
    }
  };

  const removeName = (id: string) => {
    setNames(names.filter((person) => person.id !== id));
  };

  // Calculate weighted segments based on wins
  const calculateWeightedSegments = () => {
    const baseWeight = 1;
    const penaltyPerWin = 0.2; // Reduce segment size by 20% per win

    return names.map((person) => {
      const weight = Math.max(0.1, baseWeight - person.wins * penaltyPerWin); // Minimum 10% chance
      return {
        ...person,
        weight,
      };
    });
  };

  const getSegmentAngles = () => {
    const weightedPeople = calculateWeightedSegments();
    const totalWeight = weightedPeople.reduce(
      (sum, person) => sum + person.weight,
      0
    );

    let currentAngle = 0;
    return weightedPeople.map((person) => {
      const segmentAngle = (person.weight / totalWeight) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + segmentAngle;
      currentAngle = endAngle;

      return {
        ...person,
        startAngle,
        endAngle,
        segmentAngle,
      };
    });
  };

  const spinWheel = () => {
    if (names.length === 0) return;

    setIsSpinning(true);
    setWinner(null);

    // Generate random rotation (multiple full spins + random angle)
    const baseRotation = 360 * 5; // 5 full spins minimum
    const randomAngle = Math.random() * 360;
    const totalRotation = baseRotation + randomAngle;

    setRotation((prev) => prev + totalRotation);

    // Calculate which segment the pointer will land on using weighted segments
    // The pointer is at the top (0 degrees), so we need to find which segment
    // will be at the top after the rotation completes
    const finalRotation = (rotation + totalRotation) % 360;
    const segments = getSegmentAngles();

    // Find which segment will be at the top (0 degrees) after rotation
    // Since the wheel rotates clockwise, we need to find the segment that
    // will be positioned at 0 degrees when the rotation stops
    let selectedWinner = segments[0];
    for (const segment of segments) {
      // Check if this segment will be at the top after rotation
      const segmentTopAngle = (360 - finalRotation) % 360;
      if (
        segmentTopAngle >= segment.startAngle &&
        segmentTopAngle < segment.endAngle
      ) {
        selectedWinner = segment;
        break;
      }
    }

    setTimeout(() => {
      setWinner(selectedWinner.name);
      // Increment win count for the winner
      setNames((prevNames) =>
        prevNames.map((person) =>
          person.id === selectedWinner.id
            ? { ...person, wins: person.wins + 1 }
            : person
        )
      );
      setIsSpinning(false);
    }, 3000); // Match animation duration
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addName();
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>☕ Coffee Club Wheel</h1>
        <p>Who's choosing the coffee spot today?</p>
      </header>

      <div className="wheel-container">
        <div className="wheel-wrapper">
          <svg
            className={`wheel ${isSpinning ? "spinning" : ""}`}
            style={{ transform: `rotate(${rotation}deg)` }}
            viewBox="0 0 500 500"
            width="500"
            height="500"
          >
            {getSegmentAngles().map((person, index) => {
              const startAngle = person.startAngle - 90; // Start from top
              const endAngle = person.endAngle - 90;

              // Convert angles to radians
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;

              // Calculate path coordinates
              const centerX = 250;
              const centerY = 250;
              const radius = 220;

              const x1 = centerX + radius * Math.cos(startRad);
              const y1 = centerY + radius * Math.sin(startRad);
              const x2 = centerX + radius * Math.cos(endRad);
              const y2 = centerY + radius * Math.sin(endRad);

              const largeArcFlag = person.segmentAngle > 180 ? 1 : 0;

              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                "Z",
              ].join(" ");

              return (
                <g key={person.id}>
                  <path
                    d={pathData}
                    fill={index % 2 === 0 ? "#00d4aa" : "#00a8cc"}
                    stroke="#1a365d"
                    strokeWidth="2"
                  />
                  <text
                    x={
                      centerX +
                      radius * 0.85 * Math.cos((startRad + endRad) / 2)
                    }
                    y={
                      centerY +
                      radius * 0.85 * Math.sin((startRad + endRad) / 2)
                    }
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="segment-text"
                    fontSize="16"
                    fontWeight="bold"
                    fill="#ffffff"
                    transform={`rotate(${(((startRad + endRad) / 2) * 180) / Math.PI}, ${
                      centerX +
                      radius * 0.85 * Math.cos((startRad + endRad) / 2)
                    }, ${
                      centerY +
                      radius * 0.85 * Math.sin((startRad + endRad) / 2)
                    })`}
                  >
                    {person.name}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="wheel-pointer"></div>
        </div>

        {winner && (
          <div className="winner-display">
            <h2>🎉 {winner} wins! 🎉</h2>
            <p>Time to pick a coffee spot!</p>
          </div>
        )}
      </div>

      <div className="controls">
        <div className="add-name-section">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Enter a name..."
            className="name-input"
            disabled={isSpinning}
          />
          <button
            onClick={addName}
            className="add-button"
            disabled={isSpinning || !newName.trim()}
          >
            Add Name
          </button>
        </div>

        <div className="names-list">
          {names.map((person) => (
            <div key={person.id} className="name-item">
              <div className="name-info">
                <span>{person.name}</span>
                <span className="win-count">Wins: {person.wins}</span>
              </div>
              <div className="name-actions">
                <button
                  onClick={() =>
                    setNames((prevNames) =>
                      prevNames.map((p) =>
                        p.id === person.id
                          ? { ...p, wins: Math.max(0, p.wins - 1) }
                          : p
                      )
                    )
                  }
                  className="decrease-wins-button"
                  disabled={isSpinning || person.wins === 0}
                  title="Decrease wins"
                >
                  −
                </button>
                <button
                  onClick={() => removeName(person.id)}
                  className="remove-button"
                  disabled={isSpinning}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="action-buttons">
          <button
            onClick={() =>
              setNames((prevNames) =>
                prevNames.map((person) => ({ ...person, wins: 0 }))
              )
            }
            className="reset-wins-button"
            disabled={isSpinning}
          >
            🔄 Reset All Wins
          </button>

          <button
            onClick={spinWheel}
            className={`spin-button ${isSpinning ? "spinning" : ""}`}
            disabled={names.length === 0 || isSpinning}
          >
            {isSpinning ? "Spinning..." : "🎯 Spin the Wheel!"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

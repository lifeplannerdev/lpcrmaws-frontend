import React, { useState, useEffect } from 'react';
import { MentionsInput, Mention } from 'react-mentions';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const defaultStyle = {
  control: {
    backgroundColor: '#fff',
    fontSize: 14,
    fontWeight: 'normal',
  },
  input: {
    padding: '10px 12px',
    border: '2px solid #e5e7eb',
    borderRadius: '0.75rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputFocused: {
    borderColor: '#6366f1', // indigo-500
  },
  highlighter: {
    padding: '10px 12px',
  },
  suggestions: {
    list: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      fontSize: 14,
      borderRadius: '0.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
    },
    item: {
      padding: '8px 12px',
      borderBottom: '1px solid #f3f4f6',
    },
    itemFocused: {
      backgroundColor: '#eff6ff', // blue-50
    },
  },
};

export default function MentionsTextarea({ value, onChange, name, placeholder, rows = 4 }) {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (accessToken) {
      fetch(`${API_BASE_URL}/employees/list/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      .then(res => res.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : (data.results || data.employees || []);
        // Map to format required by react-mentions: { id, display }
        const mapped = arr.map(u => ({
          id: u.username,
          display: u.username
        }));
        setUsers(mapped);
      })
      .catch(err => console.error('Failed to fetch users for mentions:', err));
    }
  }, [accessToken]);

  const handleChange = (e, newValue, newPlainTextValue, mentions) => {
    // Send event-like object to parent's onChange
    if (onChange) {
      onChange({ target: { name, value: newValue } });
    }
  };

  return (
    <div className="w-full">
      <MentionsInput
        value={value || ''}
        onChange={handleChange}
        style={defaultStyle}
        placeholder={placeholder}
        a11ySuggestionsListLabel={"Suggested mentions"}
        allowSpaceInQuery
      >
        <Mention
          trigger="@"
          data={users}
          markup="@[__display__]"
          displayTransform={(id, display) => `@${display}`}
          className="text-indigo-600 bg-indigo-50 px-1 rounded font-medium"
        />
      </MentionsInput>
    </div>
  );
}

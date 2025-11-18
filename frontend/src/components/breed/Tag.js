import React from 'react';
import { Link } from 'react-router-dom';

const Tag = ({ tag, clickable = true }) => {
  const content = (
    <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
      #{tag}
    </span>
  );

  if (clickable) {
    return (
      <Link to={`/cats?tag=${encodeURIComponent(tag)}`} className="hover:opacity-75">
        {content}
      </Link>
    );
  }

  return content;
};

export default Tag;
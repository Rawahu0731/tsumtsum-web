import React from 'react';
import { Link } from 'react-router-dom';

type FeatureCardProps = {
  title: string;
  description: string;
  to: string;
  icon?: React.ReactNode;
};

export default function FeatureCard({ title, description, to, icon }: FeatureCardProps) {
  return (
    <Link to={to} className="ft-card" aria-label={title}>
      <div className="ft-card-inner">
        <div className="ft-card-media">
          <div className="ft-icon" aria-hidden>
            {icon}
          </div>
        </div>

        <div className="ft-card-body">
          <h3 className="ft-card-title">{title}</h3>
          <p className="ft-card-desc">{description}</p>
          <div className="ft-card-cta">開く →</div>
        </div>
      </div>
    </Link>
  );
}

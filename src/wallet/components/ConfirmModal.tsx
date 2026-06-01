import React from 'react';

type Props = {
    open: boolean;
    title?: string;
    message?: React.ReactNode;
    previewUrl?: string | null;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmModal({ open, title = '確認', message, previewUrl, onConfirm, onCancel }: Props) {
    if (!open) return null;

    return (
        <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={title}>
            <div style={modalStyle}>
                <div style={{ width: '100%', textAlign: 'center', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 18, color: '#111827' }}>{title}</h3>
                </div>

                <div style={{ color: '#374151', fontSize: 15, marginBottom: 12, width: '100%', textAlign: 'center' }}>{message}</div>

                {previewUrl && (
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                        <img
                            src={previewUrl}
                            alt="preview"
                            style={{
                                display: 'block',
                                maxWidth: '100%',
                                maxHeight: '50vh',
                                width: 'auto',
                                height: 'auto',
                                objectFit: 'contain',
                                borderRadius: 8,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                margin: '0 auto'
                            }}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                    <button onClick={onCancel} style={cancelButtonStyle}>キャンセル</button>
                    <button onClick={onConfirm} style={confirmButtonStyle}>この値を入力する</button>
                </div>
            </div>
        </div>
    );
}

const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: 16,
};

const modalStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 420,
    background: '#ffffff',
    borderRadius: 14,
    padding: 20,
    boxShadow: '0 8px 30px rgba(2,6,23,0.12)',
    border: '1px solid #e6eef8',
    maxHeight: '80vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
};

const confirmButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 14px',
    background: 'linear-gradient(135deg,#3b82f6 0%,#2563eb 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontWeight: 600,
    cursor: 'pointer',
    minWidth: 0,
};

const cancelButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '12px 14px',
    background: '#fff',
    color: '#374151',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    minWidth: 0,
};

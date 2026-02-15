import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key,
  Plus,
  Copy,
  Trash2,
  AlertTriangle,
  Check,
  Loader2,
  Terminal,
  Eye,
  EyeOff,
} from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  keyPreview: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

interface NewKeyResponse {
  id: string
  key: string
  name: string
  createdAt: string
}

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<NewKeyResponse | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showCurlExamples, setShowCurlExamples] = useState(false)

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/keys')
      if (res.ok) {
        const data = await res.json()
        setKeys(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'Default' }),
      })
      if (res.ok) {
        const data: NewKeyResponse = await res.json()
        setNewKey(data)
        setShowCreateForm(false)
        setNewKeyName('')
        fetchKeys()
      }
    } catch {
      // silent
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    setRevoking(id)
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchKeys()
        setConfirmRevoke(null)
      }
    } catch {
      // silent
    } finally {
      setRevoking(null)
    }
  }

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // silent
    }
  }

  const activeKeys = keys.filter(k => !k.revokedAt)
  const revokedKeys = keys.filter(k => k.revokedAt)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">API Keys</h3>
        </div>
        {!showCreateForm && !newKey && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create New Key
          </motion.button>
        )}
      </div>

      {/* New key creation form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.03]">
              <label className="block text-xs text-white/40 mb-1.5">Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Production, CI/CD, Local Dev"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Generate
                </button>
                <button
                  onClick={() => { setShowCreateForm(false); setNewKeyName('') }}
                  className="px-3 py-1.5 rounded-lg text-white/40 text-xs hover:text-white/60 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Newly created key (shown once) */}
      <AnimatePresence>
        {newKey && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10"
          >
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-300">
                This key will only be shown once. Copy it now and store it securely.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg bg-black/30 text-xs text-green-400 font-mono break-all">
                {newKey.key}
              </code>
              <button
                onClick={() => handleCopyKey(newKey.key)}
                className="shrink-0 p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/40" />
                )}
              </button>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="mt-3 text-xs text-white/30 hover:text-white/50 transition-colors"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
        </div>
      ) : activeKeys.length === 0 && !newKey ? (
        <div className="text-center py-8 text-white/30 text-sm">
          No API keys yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {activeKeys.map(k => (
            <div
              key={k.id}
              className="flex items-center justify-between p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/80 font-medium">{k.name}</span>
                  <code className="text-xs text-white/30 font-mono">{k.keyPreview}</code>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-white/25">
                  <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                  {k.lastUsedAt && (
                    <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div>
                {confirmRevoke === k.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">Revoke?</span>
                    <button
                      onClick={() => handleRevoke(k.id)}
                      disabled={revoking === k.id}
                      className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      {revoking === k.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmRevoke(null)}
                      className="px-2 py-1 rounded text-xs text-white/30 hover:text-white/50 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRevoke(k.id)}
                    className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-white/20 mb-2">Revoked Keys</p>
          <div className="space-y-1">
            {revokedKeys.map(k => (
              <div key={k.id} className="flex items-center gap-2 px-3 py-2 rounded-lg opacity-40">
                <span className="text-xs text-white/40 line-through">{k.name}</span>
                <code className="text-xs text-white/20 font-mono">{k.keyPreview}</code>
                <span className="text-xs text-red-400/50">Revoked</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage examples */}
      <div className="mt-6">
        <button
          onClick={() => setShowCurlExamples(!showCurlExamples)}
          className="flex items-center gap-2 text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          <Terminal className="w-3.5 h-3.5" />
          {showCurlExamples ? 'Hide' : 'Show'} usage examples
          {showCurlExamples ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>

        <AnimatePresence>
          {showCurlExamples && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs text-white/30 mb-1">Research a company:</p>
                  <pre className="p-3 rounded-lg bg-black/30 text-xs text-green-400/80 font-mono overflow-x-auto">
{`curl -X POST https://your-domain.com/api/v1/research \\
  -H "Authorization: Bearer ra_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"domain": "example.com"}'`}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-white/30 mb-1">List reports:</p>
                  <pre className="p-3 rounded-lg bg-black/30 text-xs text-green-400/80 font-mono overflow-x-auto">
{`curl https://your-domain.com/api/v1/reports \\
  -H "Authorization: Bearer ra_YOUR_KEY"`}
                  </pre>
                </div>
                <div>
                  <p className="text-xs text-white/30 mb-1">Compare companies:</p>
                  <pre className="p-3 rounded-lg bg-black/30 text-xs text-green-400/80 font-mono overflow-x-auto">
{`curl -X POST https://your-domain.com/api/v1/compare \\
  -H "Authorization: Bearer ra_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"domains": ["company1.com", "company2.com"]}'`}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { PublicForm } from '../lib/types'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

export default function PublicRegistrationPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [form, setForm] = useState<PublicForm | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  const [values, setValues] = useState<Record<string, string | string[]>>({})

  useEffect(() => {
    if (!eventId) return
    loadForm()
  }, [eventId])

  async function loadForm() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_public_form', { p_event_id: eventId })
    if (error || !data || data.error) {
      setLoadError(data?.error ?? error?.message ?? 'Could not load registration form.')
    } else {
      setForm(data as PublicForm)
    }
    setLoading(false)
  }

  function setValue(key: string, value: string | string[]) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setErrMsg('')
    setSubmitting(true)

    const emptyCore = {
      first_name: '', surname: '', other_names: '',
      gender: '', age: '', phone: '', province: '', email: '',
    }

    const coreKeys = ['first_name', 'surname', 'other_names', 'gender', 'age', 'phone', 'province', 'email']
    const pCore: Record<string, any> = { ...emptyCore }
    const pCustom: Record<string, any> = {}

    for (const [k, v] of Object.entries(values)) {
      if (coreKeys.includes(k)) {
        pCore[k] = v
      } else {
        pCustom[k] = v
      }
    }

    const { data, error } = await supabase.rpc('submit_registration', {
      p_event_id: eventId,
      p_core:     pCore,
      p_custom:   pCustom,
    })

    setSubmitting(false)

    if (error || !data?.success) {
      setErrMsg(data?.error ?? error?.message ?? 'Something went wrong. Please try again.')
      return
    }

    setSubmitted(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-magenta rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError || !form) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-sm border border-slate-100">
          <AlertTriangle size={40} className="mx-auto text-amber-400 mb-4" />
          <h2 className="font-bold text-slate-800 mb-2 text-lg">Registration Unavailable</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{loadError}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-5">
        <div className="bg-white rounded-[2rem] p-10 max-w-md w-full text-center shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={36} className="text-green-500" />
          </div>
          <h2 className="font-extrabold text-slate-900 mb-3 text-2xl tracking-tight">You're registered! 🎉</h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Your spot for <span className="font-bold text-slate-800">{form.event.name}</span> is secured. See you there!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] py-12 px-4 sm:px-6 font-sans text-slate-900">
      
      <header className="max-w-2xl mx-auto mb-10 text-center">
        <div className="inline-block px-4 py-1.5 mb-5 rounded-full bg-magenta/10 text-magenta text-xs font-bold tracking-widest uppercase">
          Registration Open
        </div>
        <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase mb-2">
          {form.event.name}
        </h2>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900">
          {form.title}
        </h1>
        {form.description && (
          <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            {form.description}
          </p>
        )}
      </header>

      <main className="max-w-2xl mx-auto bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-10">

          {form.fields.map(f => (
            <div key={f.field_key} className="group">
              <label className="block text-lg font-bold mb-3 text-slate-800">
                {f.label}
                {f.required && <span className="text-magenta ml-1.5">*</span>}
              </label>
              <FieldInput
                field={f}
                value={values[f.field_key]}
                onChange={v => setValue(f.field_key, v)}
              />
            </div>
          ))}

          {errMsg && (
            <div className="bg-red-50 text-red-600 border border-red-100 rounded-2xl p-4 text-sm font-medium flex items-center gap-3">
              <AlertTriangle size={18} />
              {errMsg}
            </div>
          )}

          <div className="pt-6 border-t border-slate-100">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-magenta to-magenta-dark hover:from-magenta-dark hover:to-magenta text-white font-bold text-lg py-5 rounded-2xl shadow-xl shadow-magenta/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:hover:scale-100"
            >
              {submitting ? 'Securing your spot...' : 'Complete Registration'}
            </button>
          </div>

        </form>
      </main>
      
      <div className="text-center mt-10 text-sm font-semibold text-slate-400">
        Powered by your platform
      </div>
    </div>
  )
}

// ── The Reimagined FieldInput Component ──────────────────────

const standardInputCls = "w-full bg-slate-50 border-b-2 border-slate-100 px-5 py-4 rounded-t-xl outline-none focus:border-magenta focus:bg-white transition-all text-slate-800 font-medium placeholder-slate-400"

function FieldInput({ field, value, onChange }: {
  field: { field_key: string; field_type: string; options: string[] | null; required: boolean }
  value: string | string[] | undefined
  onChange: (v: string | string[]) => void
}) {
  switch (field.field_type) {
    case 'textarea':
      return (
        <textarea
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          required={field.required}
          rows={3}
          placeholder="Your answer"
          className={`${standardInputCls} resize-y`}
        />
      )
    case 'select':
      return (
        <div className="relative">
          <select
            value={(value as string) ?? ''}
            onChange={e => onChange(e.target.value)}
            required={field.required}
            className={`${standardInputCls} appearance-none cursor-pointer`}
          >
            <option value="" disabled>Choose an option</option>
            {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )
    case 'radio':
      return (
        <div className="space-y-3">
          {(field.options ?? []).map(o => (
            <label key={o} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-200 cursor-pointer transition-all has-[:checked]:border-magenta has-[:checked]:bg-magenta/5 has-[:checked]:shadow-sm">
              <input 
                type="radio" 
                name={field.field_key}
                value={o}
                checked={value === o}
                required={field.required}
                onChange={e => onChange(e.target.value)}
                className="w-5 h-5 text-magenta border-slate-300 focus:ring-magenta accent-magenta" 
              />
              <span className="text-slate-700 font-medium text-lg">{o}</span>
            </label>
          ))}
        </div>
      )
    case 'checkbox': {
      const arr = Array.isArray(value) ? value : []
      return (
        <div className="space-y-3">
          {(field.options ?? []).map(o => (
            <label key={o} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-200 cursor-pointer transition-all has-[:checked]:border-magenta has-[:checked]:bg-magenta/5 has-[:checked]:shadow-sm">
              <input 
                type="checkbox" 
                value={o}
                checked={arr.includes(o)}
                onChange={e => onChange(e.target.checked ? [...arr, o] : arr.filter(x => x !== o))}
                className="w-5 h-5 text-magenta rounded border-slate-300 focus:ring-magenta accent-magenta" 
              />
              <span className="text-slate-700 font-medium text-lg">{o}</span>
            </label>
          ))}
        </div>
      )
    }
    case 'number':
      return <input type="number" placeholder="0" value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} required={field.required} className={standardInputCls} />
    case 'date':
      return <input type="date" value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} required={field.required} className={standardInputCls} />
    case 'email':
      return <input type="email" placeholder="you@example.com" value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} required={field.required} className={standardInputCls} />
    case 'phone':
      return <input type="tel" placeholder="+1 (555) 000-0000" value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} required={field.required} className={standardInputCls} />
    default:
      return <input type="text" placeholder="Your answer" value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} required={field.required} className={standardInputCls} />
  }
}

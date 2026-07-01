import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  GripVertical, Link2, Save, Circle, Square, X
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvidedDragHandleProps } from '@hello-pangea/dnd'
import Skeleton from '../components/Skeleton'
import type { EventForm, FormField, FieldType } from '../lib/types'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text',     label: 'Short Text' },
  { value: 'textarea', label: 'Paragraph' },
  { value: 'email',    label: 'Email' },
  { value: 'phone',    label: 'Phone' },
  { value: 'number',   label: 'Number' },
  { value: 'date',     label: 'Date' },
  { value: 'select',   label: 'Dropdown' },
  { value: 'radio',    label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Checkboxes' },
]

const DEFAULT_FIELDS: FormField[] = [
  { field_key: 'first_name', label: 'First Name', field_type: 'text', options: null, required: true, display_order: 0 },
  { field_key: 'surname',    label: 'Surname',    field_type: 'text', options: null, required: true, display_order: 1 },
]

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field'
}

export default function FormBuilderPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<EventForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (eventId) load() }, [eventId])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_event_form', { p_event_id: eventId })
    if (error || !data) {
      toast.error(error?.message ?? 'Failed to load form')
    } else {
      const loaded = data as EventForm
      if (!loaded.fields || loaded.fields.length === 0) {
        loaded.fields = DEFAULT_FIELDS
      }
      loaded.fields = loaded.fields.map(f => ({
        ...f,
        options: f.options || (['select', 'radio', 'checkbox'].includes(f.field_type) ? ['Option 1'] : null)
      }))
      setForm(loaded)
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    const { error } = await supabase.rpc('save_event_form', {
      p_event_id:            eventId,
      p_title:               form.title,
      p_description:         form.description,
      p_core_field_settings: form.core_field_settings, 
      p_is_published:        form.is_published,
      p_fields:              form.fields,
    })
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Form saved!')
  }

  function addField() {
    if (!form) return
    const newField: FormField = {
      field_key:     `field_${Date.now()}`,
      label:         '',
      field_type:    'text',
      options:       null,
      required:      false,
      display_order: form.fields.length,
    }
    setForm({ ...form, fields: [...form.fields, newField] })
  }

  function updateField(idx: number, patch: Partial<FormField>) {
    if (!form) return
    const fields = [...form.fields]
    fields[idx] = { ...fields[idx], ...patch }
    if (patch.label !== undefined && !['first_name', 'surname'].includes(fields[idx].field_key)) {
      fields[idx].field_key = slugify(patch.label)
    }
    setForm({ ...form, fields })
  }

  function removeField(idx: number) {
    if (!form) return
    const fields = form.fields
      .filter((_, i) => i !== idx)
      .map((f, i) => ({ ...f, display_order: i }))
    setForm({ ...form, fields })
  }

  function handleDragEnd(result: DropResult) {
    if (!result.destination || !form) return
    const items = Array.from(form.fields)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    
    const updatedFields = items.map((item, index) => ({ ...item, display_order: index }))
    setForm({ ...form, fields: updatedFields })
  }

  function moveField(idx: number, dir: -1 | 1) {
    if (!form) return
    const target = idx + dir
    if (target < 0 || target >= form.fields.length) return
    const fields = [...form.fields]
    ;[fields[idx], fields[target]] = [fields[target], fields[idx]]
    fields.forEach((f, i) => { f.display_order = i })
    setForm({ ...form, fields })
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/register/${eventId}`)
    toast.success('Registration link copied!')
  }

  if (loading || !form) {
    return <FormBuilderSkeleton onBack={() => navigate(-1)} />
  }

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-[#F8F9FC]">
      <header className="bg-carbon px-4 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-white font-semibold text-sm">Form Builder</h1>
            <p className="text-white/40 text-xs">Edit your registration form</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={copyLink} className="flex items-center gap-1.5 bg-white/10 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-white/20 transition-colors"><Link2 size={13} /> Copy Link</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 bg-gradient-to-r from-magenta to-magenta-dark text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-magenta/20 disabled:opacity-60"><Save size={13} /> {saving ? 'Saving...' : 'Save Form'}</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 pb-32">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {form.is_published ? <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center"><Eye size={16} className="text-green-600" /></div> : <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center"><EyeOff size={16} className="text-slate-400" /></div>}
            <div>
              <span className="block text-sm font-bold text-slate-800">{form.is_published ? 'Registration is Open' : 'Registration is Closed'}</span>
            </div>
          </div>
          <Toggle checked={form.is_published} onChange={v => setForm({ ...form, is_published: v })} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-5 shadow-sm">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Form Title" className="w-full text-3xl font-extrabold outline-none bg-transparent placeholder-slate-300" />
          <textarea value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Add a description..." className="w-full border border-transparent hover:border-slate-200 focus:border-magenta rounded-xl px-4 py-3 text-sm outline-none bg-slate-50 resize-none" />
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="form-fields">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                {form.fields.map((field, idx) => (
                  <Draggable key={field.field_key} draggableId={field.field_key} index={idx}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} className={snapshot.isDragging ? 'opacity-90 scale-[1.01] shadow-2xl z-50 rounded-2xl' : ''}>
                        <FieldEditor field={field} dragHandleProps={provided.dragHandleProps} onUpdate={patch => updateField(idx, patch)} onRemove={() => removeField(idx)} onMoveUp={() => moveField(idx, -1)} onMoveDown={() => moveField(idx, 1)} isFirst={idx === 0} isLast={idx === form.fields.length - 1} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <button onClick={addField} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-dashed border-slate-200 text-slate-500 hover:border-magenta hover:text-magenta py-4 rounded-2xl font-bold text-sm transition-all"><Plus size={16} /> Add New Question</button>
      </main>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`relative rounded-full transition-colors w-11 h-6 ${checked ? 'bg-green-500' : 'bg-slate-200'}`}>
      <span className={`absolute top-0.5 left-0.5 bg-white rounded-full shadow w-5 h-5 transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

// Real header (back button stays functional) + skeleton cards mirroring
// the publish toggle, title/description block, and a couple of field rows.
function FormBuilderSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-screen overflow-hidden bg-[#F8F9FC]">
      <header className="bg-carbon px-4 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white/70 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-white font-semibold text-sm">Form Builder</h1>
            <p className="text-white/40 text-xs">Edit your registration form</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-3.5 w-40" />
          </div>
          <Skeleton className="w-11 h-6 rounded-full" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-4 shadow-sm">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>

        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border border-slate-200 rounded-2xl bg-white shadow-sm p-5 space-y-4">
            <Skeleton className="h-12 w-full rounded-t-lg" />
            <div className="flex justify-end gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}

type FieldEditorProps = {
  field: FormField
  dragHandleProps: DraggableProvidedDragHandleProps | null
  onUpdate: (patch: Partial<FormField>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
}

function FieldEditor({ field, dragHandleProps, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast }: FieldEditorProps) {
  const isMultipleChoice = field.field_type === 'radio'; const isCheckbox = field.field_type === 'checkbox'; const isDropdown = field.field_type === 'select'
  const needsOptions = isMultipleChoice || isCheckbox || isDropdown

  return (
    <div className="group relative border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div {...dragHandleProps} className="mt-3 cursor-grab text-slate-300 hover:text-slate-500"><GripVertical size={18} /></div>
          <input value={field.label} onChange={e => onUpdate({ label: e.target.value })} placeholder="Question" className="flex-1 bg-slate-50 border-b-2 border-transparent px-4 py-3 text-lg font-semibold outline-none focus:border-magenta rounded-t-lg" />
          <select value={field.field_type} onChange={e => onUpdate({ field_type: e.target.value as FieldType, options: ['select', 'radio', 'checkbox'].includes(e.target.value) ? (field.options?.length ? field.options : ['Option 1']) : null })} className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none bg-white hover:bg-slate-50 cursor-pointer">{FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
        </div>
        {needsOptions && (
          <div className="pl-9 pr-4 space-y-2 mb-2">
            {(field.options || []).map((opt: string, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <input value={opt} onChange={e => { const newOpts = [...(field.options || [])]; newOpts[idx] = e.target.value; onUpdate({ options: newOpts }) }} className="flex-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-magenta outline-none py-1.5 text-sm" />
                <button onClick={() => onUpdate({ options: (field.options || []).filter((_: any, i: number) => i !== idx) })} className="text-slate-300 hover:text-red-500"><X size={16} /></button>
              </div>
            ))}
            <button onClick={() => onUpdate({ options: [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`] })} className="text-sm font-semibold text-slate-400 hover:text-magenta mt-2">Add Option</button>
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-4 px-5 py-3 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
        <label className="flex items-center gap-2 text-sm text-slate-600 font-bold cursor-pointer"><input type="checkbox" checked={field.required} onChange={e => onUpdate({ required: e.target.checked })} className="accent-magenta" /> Required</label>
        <button onClick={onMoveUp} disabled={isFirst} className="p-1 text-slate-400 disabled:opacity-20"><ChevronUp size={16} /></button>
        <button onClick={onMoveDown} disabled={isLast} className="p-1 text-slate-400 disabled:opacity-20"><ChevronDown size={16} /></button>
        <button onClick={onRemove} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
      </div>
    </div>
  )
}

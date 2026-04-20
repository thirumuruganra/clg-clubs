import React, { useMemo, useState } from 'react';
import { SearchBar } from '../ui/search-bar';

const ClubMembersTab = ({
  members,
  membersLoading,
  membersError,
  calculateYear,
  memberActionError,
  memberActionSuccess,
  onOpenAddMember,
  onRemoveMember,
  addMemberOpen,
  onCloseAddMember,
  memberSearch,
  setMemberSearch,
  memberDepartmentFilter,
  setMemberDepartmentFilter,
  memberYearFilter,
  setMemberYearFilter,
  studentResults,
  studentsLoading,
  studentsError,
  onAddMember,
  memberDepartmentOptions,
  studentYearOptions,
}) => {
  const [memberQuery, setMemberQuery] = useState('');

  const filteredMembers = useMemo(() => {
    const normalized = memberQuery.trim().toLowerCase();
    if (!normalized) return members;

    return members.filter((member) =>
      [member.name, member.email, member.department, member.register_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [members, memberQuery]);

  const visibleMembers = filteredMembers.length;

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-7 xl:p-8">
      <div className="dashboard-hero enter-rise-settle mb-6 p-4 sm:mb-8 sm:p-6 lg:p-7">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="kicker-label border-white/28 bg-white/10 text-white">Club Workforce</span>
            <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">Club Members</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/82 sm:text-base">Students currently part of your club operations and execution team.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-xl border border-white/15 bg-black/24 px-3 py-2 text-center text-white backdrop-blur-sm sm:px-4 sm:py-3">
              <p className="font-display text-xl font-bold leading-none sm:text-2xl">{members.length}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/75">Total</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/24 px-3 py-2 text-center text-white backdrop-blur-sm sm:px-4 sm:py-3">
              <p className="font-display text-xl font-bold leading-none sm:text-2xl">{visibleMembers}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/75">Visible</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAddMember}
          className="relative z-10 mt-5 touch-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 sm:mt-6 sm:w-auto"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Add Member
        </button>
      </div>

      <div className="mb-4">
        <SearchBar
          value={memberQuery}
          onChange={setMemberQuery}
          placeholder="Search members"
        />
      </div>

      {membersError && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{membersError}</p>
      )}
      {memberActionError && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{memberActionError}</p>
      )}
      {memberActionSuccess && (
        <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">{memberActionSuccess}</p>
      )}

      <div className="table-scroll overflow-hidden rounded-xl border border-border-subtle bg-surface-panel shadow-soft-sm dark:border-border-strong dark:bg-surface-elevated">
        {membersLoading ? (
          <div className="px-4 py-10 text-sm text-text-secondary dark:text-text-dark-secondary">Loading club members...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="px-4 py-10 text-sm text-text-secondary dark:text-text-dark-secondary">No members match your search.</div>
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {filteredMembers.map((member) => {
                const memberInitial = (member.name || member.email || '?').charAt(0).toUpperCase();
                return (
                  <article key={member.id} className="rounded-xl border border-border-subtle bg-surface-panel p-3 shadow-soft-sm dark:border-border-strong dark:bg-surface-canvas/65">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {member.picture ? (
                          <img src={member.picture} alt={member.name || 'Member'} className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{memberInitial}</div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold" title={member.name || 'Unnamed student'}>{member.name || 'Unnamed student'}</p>
                          <p className="truncate text-xs text-text-secondary dark:text-text-dark-secondary" title={member.email || '-'}>{member.email || '-'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveMember(member)}
                        className="rounded-lg border border-red-500/25 px-2.5 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-surface-muted px-2 py-1.5 dark:bg-border-strong/55">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Dept</p>
                        <p className="mt-1 truncate font-semibold">{member.department || '-'}</p>
                      </div>
                      <div className="rounded-lg bg-surface-muted px-2 py-1.5 dark:bg-border-strong/55">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Year</p>
                        <p className="mt-1 font-semibold">{calculateYear(member.batch, member.degree, member.register_number)}</p>
                      </div>
                      <div className="rounded-lg bg-surface-muted px-2 py-1.5 dark:bg-border-strong/55">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Reg No</p>
                        <p className="mt-1 truncate font-semibold" title={member.register_number || '-'}>{member.register_number || '-'}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden md:block">
              <table className="w-full min-w-184 table-fixed">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[24%]" />
                  <col className="w-[18%]" />
                  <col className="w-[10%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="bg-surface-muted dark:bg-border-strong/55">
                  <tr className="border-b border-border-subtle dark:border-border-strong">
                    {['Student', 'Email', 'Department', 'Year', 'Register No', 'Actions'].map((header) => (
                      <th
                        key={header}
                        className={`px-5 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-text-secondary dark:text-text-dark-secondary ${header === 'Actions' ? 'text-center' : 'text-left'}`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => {
                    const memberInitial = (member.name || member.email || '?').charAt(0).toUpperCase();

                    return (
                      <tr key={member.id} className="border-b border-border-subtle transition-colors hover:bg-surface-muted dark:border-border-strong dark:hover:bg-border-strong/50">
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            {member.picture ? (
                              <img src={member.picture} alt={member.name || 'Member'} className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{memberInitial}</div>
                            )}
                            <span className="block truncate text-sm font-semibold" title={member.name || 'Unnamed student'}>{member.name || 'Unnamed student'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle text-sm text-text-secondary dark:text-text-dark-secondary">
                          <span className="block truncate" title={member.email || '-'}>{member.email || '-'}</span>
                        </td>
                        <td className="px-5 py-4 align-middle text-sm">{member.department || '-'}</td>
                        <td className="px-5 py-4 align-middle text-sm">{calculateYear(member.batch, member.degree, member.register_number)}</td>
                        <td className="px-5 py-4 align-middle text-sm">
                          <span className="block truncate" title={member.register_number || '-'}>{member.register_number || '-'}</span>
                        </td>
                        <td className="px-5 py-4 align-middle text-center">
                          <button
                            type="button"
                            onClick={() => onRemoveMember(member)}
                            className="inline-flex min-w-22 items-center justify-center rounded-lg border border-red-500/25 px-3 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {addMemberOpen && (
        <div className="fixed inset-0 z-1100 flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-5" onClick={onCloseAddMember}>
          <div
            className="flex w-[min(96vw,76rem)] max-h-[92dvh] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel shadow-soft-xl dark:border-border-strong dark:bg-surface-elevated"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-4 sm:px-5 dark:border-border-strong">
              <div>
                <h2 className="font-display text-lg font-bold">Add Club Member</h2>
                <p className="mt-0.5 text-xs text-text-secondary dark:text-text-dark-secondary">Search registered WAVC students. Filter by department and year.</p>
              </div>
              <button
                type="button"
                onClick={onCloseAddMember}
                className="touch-target flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted dark:text-text-dark-secondary dark:hover:bg-border-strong"
                aria-label="Close add member dialog"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-4 border-b border-border-subtle px-4 py-4 sm:px-5 dark:border-border-strong">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <SearchBar
                  value={memberSearch}
                  onChange={setMemberSearch}
                  placeholder="Search by name, email, register no"
                  className="h-10 rounded-xl bg-surface-muted dark:bg-border-strong"
                  inputClassName="px-2"
                  iconClassName="bg-transparent p-0 text-[18px]"
                />

                <select
                  value={memberDepartmentFilter}
                  onChange={(event) => setMemberDepartmentFilter(event.target.value)}
                  className="h-10 rounded-xl border border-border-subtle bg-white px-3 text-sm focus:border-primary focus:outline-none dark:border-border-strong dark:bg-[#111a22] dark:text-white"
                >
                  <option value="">All departments</option>
                  {memberDepartmentOptions.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>

                <select
                  value={memberYearFilter}
                  onChange={(event) => setMemberYearFilter(event.target.value)}
                  className="h-10 rounded-xl border border-border-subtle bg-white px-3 text-sm focus:border-primary focus:outline-none dark:border-border-strong dark:bg-[#111a22] dark:text-white"
                >
                  <option value="">All years</option>
                  {studentYearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {studentsError && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{studentsError}</p>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-5">
              {studentsLoading ? (
                <div className="py-10 text-center text-sm text-text-secondary dark:text-text-dark-secondary">Loading registered students...</div>
              ) : studentResults.length === 0 ? (
                <div className="py-10 text-center text-sm text-text-secondary dark:text-text-dark-secondary">No students found for current filters.</div>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {studentResults.map((student) => {
                      const studentInitial = (student.name || student.email || '?').charAt(0).toUpperCase();

                      return (
                        <article key={student.id} className="rounded-xl border border-border-subtle bg-surface-panel p-3 dark:border-border-strong dark:bg-surface-canvas/65">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              {student.picture ? (
                                <img src={student.picture} alt={student.name || 'Student'} className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{studentInitial}</div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold" title={student.name || 'Unnamed student'}>{student.name || 'Unnamed student'}</p>
                                <p className="truncate text-xs text-text-secondary dark:text-text-dark-secondary" title={student.email || '-'}>{student.email || '-'}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onAddMember(student.id)}
                              className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                            >
                              Add
                            </button>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                            <div className="rounded-lg bg-surface-muted px-2 py-1.5 dark:bg-border-strong/55">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Dept</p>
                              <p className="mt-1 truncate font-semibold">{student.department || '-'}</p>
                            </div>
                            <div className="rounded-lg bg-surface-muted px-2 py-1.5 dark:bg-border-strong/55">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Year</p>
                              <p className="mt-1 font-semibold">{student.year || '-'}</p>
                            </div>
                            <div className="rounded-lg bg-surface-muted px-2 py-1.5 dark:bg-border-strong/55">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Reg No</p>
                              <p className="mt-1 truncate font-semibold" title={student.register_number || '-'}>{student.register_number || '-'}</p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="hidden md:block">
                    <table className="w-full min-w-176 table-fixed">
                      <colgroup>
                        <col className="w-[28%]" />
                        <col className="w-[26%]" />
                        <col className="w-[18%]" />
                        <col className="w-[10%]" />
                        <col className="w-[14%]" />
                        <col className="w-[8%]" />
                      </colgroup>
                      <thead className="bg-surface-muted dark:bg-border-strong/55">
                        <tr className="border-b border-border-subtle dark:border-border-strong">
                          {['Student', 'Email', 'Department', 'Year', 'Register No', 'Add'].map((header) => (
                            <th key={header} className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-text-secondary dark:text-text-dark-secondary">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {studentResults.map((student) => {
                          const studentInitial = (student.name || student.email || '?').charAt(0).toUpperCase();

                          return (
                            <tr key={student.id} className="border-b border-border-subtle dark:border-border-strong">
                              <td className="px-4 py-3 align-middle">
                                <div className="flex items-center gap-3">
                                  {student.picture ? (
                                    <img src={student.picture} alt={student.name || 'Student'} className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{studentInitial}</div>
                                  )}
                                  <span className="truncate text-sm font-medium" title={student.name || 'Unnamed student'}>{student.name || 'Unnamed student'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-middle text-sm text-text-secondary dark:text-text-dark-secondary">
                                <span className="block truncate" title={student.email || '-'}>{student.email || '-'}</span>
                              </td>
                              <td className="px-4 py-3 align-middle text-sm">{student.department || '-'}</td>
                              <td className="px-4 py-3 align-middle text-sm">{student.year || '-'}</td>
                              <td className="px-4 py-3 align-middle text-sm">
                                <span className="block truncate" title={student.register_number || '-'}>{student.register_number || '-'}</span>
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <button
                                  type="button"
                                  onClick={() => onAddMember(student.id)}
                                  className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                                >
                                  Add
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubMembersTab;

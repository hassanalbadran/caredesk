package com.hasn2mr.caredesk.admin.util

import java.time.LocalDate
import java.time.format.DateTimeFormatter

/** Dates travel as ISO yyyy-MM-dd strings (same as the desktop app and the server). */
object Dates {
    val iso: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE
    fun today(): LocalDate = LocalDate.now()
    fun format(d: LocalDate): String = d.format(iso)
    fun parse(s: String): LocalDate = LocalDate.parse(s, iso)
}

# RPGLE Code Coverage from IBM i

This section describes how to run an RPGLE code coverage analysis directly from an IBM i system using the `CODECOV` command. This method is useful when you only want to use Visual Studio Code to view the coverage report and not to execute the coverage itself.

1. **Library setup:** Add all libraries required to run the component you want to analyze. Ensure that the `QDEVTOOLS` library is in the job's library list, because it contains the tools necessary for code coverage. If you are using RPGUnit, include the `RPGUnit` library as well.


2. **Run the Coverage Command:** Enter the `CODECOV` command on the IBM i command line, press F4 and configure the following parameters:

   **Parameter 1: Program Execution Command. The program to execute can be the same program under coverage, an RPGUnit, or another program such as a CL.**
   ```
   Example: CALL PGM(MYLIB/MYPGM)
   Or: RUCALLTST TSTPGM(MYLIB/MYPGM_TEST)
   ```

   **Parameter 2: Programs/SRVPGM to Analyze**: You can request coverage for multiple programs or service programs in a single run. Specify each object on a new line with the following format:
   ```
   Examples:
   - MYLIB/MYPGM    *PGM    *ALL
   - MYLIB/MYSRVPGM *SRVPGM *ALL
   - MYLIB/MYSRVPGM *SRVPGM MODULE1
   ```

3. **Debug view: *SOURCE vs *LIST:**

Select the debug view (`*SOURCE` or `*LIST`) for coverage analysis. The `*SOURCE` view will only cover statements present in the main source member. If `/COPY` or `/INCLUDE` directives include executable statements, coverage for those statements will only be detected with the `*LIST` view. If your program does not contain a `*LIST` view, recompile with `DBGVIEW(*ALL)` or `DBGVIEW(*LIST)`.

If your program was compiled only with the `*SOURCE` view, select only `*SOURCE`. If compiled only with `*LIST`, select only `*LIST`. If compiled with all debug views, you can select either. If your program contains embedded SQL and was compiled with `DBGVIEW(*SOURCE)`, it will include all debug views. Otherwise, consult the compiler's `DBGVIEW` parameter help to determine which debug views your program has.

The `*SOURCE` debug view requires the source member from which the object was compiled to be available at the expected location. If the source member has been moved or deleted, you will not be able to run coverage with this view. The `*LIST` view uses the object listing at compile time and is always available as an alternative.

In my experience, the `*SOURCE` view is more accurate and I recommend using it when available. The `*LIST` view can be less precise.

4. **Coverage level: *LINE vs *PROC:** Determines the coverage granularity.

**Options:**

| Option | Description | Best for |
|--------|-------------|---------|
| **`*LINE`** | Measures coverage per executed lines | General use, detailed analysis |
| **`*PROC`** | Measures coverage per executed procedures | Quick overview, procedure-level tests |

**Recommendation:** Use `*LINE` for most cases.

5. **Run Coverage**: Press Enter to run the `CODECOV` command. The system will collect coverage data while the specified program runs.

![](../images/CODECOV_COMANDO.png)
![](../images/CODECOV_COMANDO_PARTE_2.png)


6. **Retrieve Results**: Once the execution has finished, the coverage results will be stored in a `.cczip` file in the user's home directory who ran the command.

7. **View Results in VS Code**:

   - Open Visual Studio Code and navigate to the RPGLE Code Coverage extension.
   - Use the option to import `.cczip` files.
   - Select the refresh icon to load newly generated coverage results.

   ![](../images/ARCHIVOS_CCZIP_REFRESCAR.png)

   - Select the generated file from the previous step by clicking it.
   - View coverage results directly in your editor, with lines highlighted for covered and uncovered, and generate professional PDF or HTML reports.
   
   ![](../images/ARCHIVOS_CCZIP_RESULTADO.png)

### Understanding your initial results

After running coverage you will see:

- **📊 Summary**: Overall coverage percentage and file count
- **📄 File list**: Each analyzed file with its coverage percentage
- **🎨 Editor highlights**: 
  - 🟢 Green = covered lines
  - 🔴 Red = uncovered lines
- **📑 PDF report**: Generated automatically in the `coverage-reports/` folder

## Next steps

Now that you ran your first coverage analysis, explore more:

**Next:** [Configuration](configuration.md) | [Troubleshooting](troubleshooting.md) | [FAQ](faq.md)
